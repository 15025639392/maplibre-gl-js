export type CoordSystem = 'wgs84' | 'gcj02' | 'bd09';

export type LngLatTuple = [number, number];

export type CoordTransformOptions = {
    applyOutsideChina?: boolean;
};

export type RasterSourceCoordSystemOptions = {
    dataCrs: CoordSystem;
    tileCrs?: CoordSystem;
    applyOutsideChina?: boolean;
};

export type RasterSourceCrsState = {
    sourceId: string;
    dataCrs: CoordSystem;
    tileCrs: CoordSystem;
    applyOutsideChina: boolean;
    updatedAt: number;
};

export function assertValidLngLat(lngLat: LngLatTuple): void {
    const [lng, lat] = lngLat;

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new Error(`Invalid coordinate: (${lng}, ${lat})`);
    }

    if (lng < -180 || lng > 180) {
        throw new Error(`Invalid longitude value: ${lng}. Must be between -180 and 180`);
    }

    if (lat < -90 || lat > 90) {
        throw new Error(`Invalid latitude value: ${lat}. Must be between -90 and 90`);
    }
}
