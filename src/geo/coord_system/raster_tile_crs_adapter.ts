import {CanonicalTileID} from '../../tile/tile_id';
import {
    bd09ToGcj02,
    bd09ToWgs84,
    gcj02ToBd09,
    gcj02ToWgs84,
    wgs84ToBd09,
    wgs84ToGcj02
} from './transform';
import type {CoordSystem, CoordTransformOptions, LngLatTuple, RasterSourceCoordSystemOptions} from './types';

const MAX_MERCATOR_LAT = 85.0511287798066;
const ZERO_RENDER_OFFSET: [number, number] = [0, 0];

export type RasterTileCrsMapping = {
    tileID: CanonicalTileID;
    // Tile-local render translation in tile units. Negative values shift geometry
    // west/north, positive values shift east/south.
    renderOffset: [number, number];
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizeLongitude(lng: number): number {
    let normalized = ((lng + 180) % 360 + 360) % 360 - 180;
    if (normalized === -180) {
        normalized = 180;
    }
    return normalized;
}

function canonicalTileOriginToLngLat(tileID: CanonicalTileID): LngLatTuple {
    const dim = Math.pow(2, tileID.z);
    const lng = tileID.x / dim * 360 - 180;
    const mercN = Math.PI - 2 * Math.PI * tileID.y / dim;
    const lat = Math.atan(Math.sinh(mercN)) * 180 / Math.PI;
    return [lng, lat];
}

function lngLatToTileCoordinate(lngLat: LngLatTuple, zoom: number): {x: number; y: number} {
    const dim = Math.pow(2, zoom);
    const lng = normalizeLongitude(lngLat[0]);
    const lat = clamp(lngLat[1], -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);

    const x = (lng + 180) / 360 * dim;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * dim;

    const wrappedX = ((x % dim) + dim) % dim;
    const clampedY = clamp(y, 0, dim - Number.EPSILON);

    return {x: wrappedX, y: clampedY};
}

function normalizeRenderOffset(value: number): number {
    return Math.abs(value) < 1e-9 ? 0 : value;
}

function transformLngLatBetweenCrs(
    lngLat: LngLatTuple,
    from: CoordSystem,
    to: CoordSystem,
    options?: CoordTransformOptions
): LngLatTuple {
    if (from === to) {
        return [lngLat[0], lngLat[1]];
    }

    switch (`${from}->${to}`) {
        case 'wgs84->gcj02':
            return wgs84ToGcj02(lngLat, options);
        case 'wgs84->bd09':
            return wgs84ToBd09(lngLat, options);
        case 'gcj02->wgs84':
            return gcj02ToWgs84(lngLat, options);
        case 'gcj02->bd09':
            return gcj02ToBd09(lngLat);
        case 'bd09->wgs84':
            return bd09ToWgs84(lngLat, options);
        case 'bd09->gcj02':
            return bd09ToGcj02(lngLat);
        default:
            throw new Error(`Unsupported CRS transform path: ${from} -> ${to}`);
    }
}

export class RasterTileCrsAdapter {
    static mapCanonicalTileID(
        tileID: CanonicalTileID,
        options: RasterSourceCoordSystemOptions
    ): CanonicalTileID {
        return this.mapCanonicalTileIDWithRenderOffset(tileID, options).tileID;
    }

    static mapCanonicalTileIDWithRenderOffset(
        tileID: CanonicalTileID,
        options: RasterSourceCoordSystemOptions
    ): RasterTileCrsMapping {
        const targetTileCrs = options.tileCrs ?? options.dataCrs;
        if (targetTileCrs === 'wgs84') {
            return {
                tileID,
                renderOffset: ZERO_RENDER_OFFSET
            };
        }

        const originWgs84 = canonicalTileOriginToLngLat(tileID);
        const transformedOrigin = transformLngLatBetweenCrs(originWgs84, 'wgs84', targetTileCrs, {
            applyOutsideChina: options.applyOutsideChina ?? false
        });

        const transformedTileCoord = lngLatToTileCoordinate(transformedOrigin, tileID.z);
        const dim = Math.pow(2, tileID.z);

        const transformedTileX = Math.floor(transformedTileCoord.x);
        const transformedTileY = Math.floor(transformedTileCoord.y);

        const wrappedX = ((transformedTileX % dim) + dim) % dim;
        const clampedY = clamp(transformedTileY, 0, dim - 1);

        const fractionX = transformedTileCoord.x - transformedTileX;
        const fractionY = transformedTileCoord.y - transformedTileY;

        const renderOffsetX = normalizeRenderOffset(-fractionX);
        const renderOffsetY = transformedTileY === clampedY
            ? normalizeRenderOffset(-fractionY)
            : 0;

        const adaptedTileID = wrappedX === tileID.x && clampedY === tileID.y
            ? tileID
            : new CanonicalTileID(tileID.z, wrappedX, clampedY);

        if (renderOffsetX === 0 && renderOffsetY === 0) {
            return {
                tileID: adaptedTileID,
                renderOffset: ZERO_RENDER_OFFSET
            };
        }

        return {
            tileID: adaptedTileID,
            renderOffset: [renderOffsetX, renderOffsetY]
        };
    }
}
