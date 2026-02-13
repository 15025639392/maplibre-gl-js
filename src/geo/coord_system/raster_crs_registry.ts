import type {CoordSystem, RasterSourceCoordSystemOptions, RasterSourceCrsState} from './types';

export type RasterSourceType = 'raster' | 'raster-dem';

type NowFn = () => number;

const RASTER_SOURCE_TYPES: Set<string> = new Set(['raster', 'raster-dem']);
const COORD_SYSTEMS: Set<string> = new Set(['wgs84', 'gcj02', 'bd09']);

function assertSourceId(sourceId: string): void {
    if (typeof sourceId !== 'string' || sourceId.trim() === '') {
        throw new Error('Invalid sourceId: must be a non-empty string');
    }
}

function assertRasterSourceType(sourceType: string): asserts sourceType is RasterSourceType {
    if (!RASTER_SOURCE_TYPES.has(sourceType)) {
        throw new Error(`Unsupported source type: ${sourceType}. Only raster and raster-dem are supported.`);
    }
}

function assertCoordSystem(value: unknown, fieldName: string): asserts value is CoordSystem {
    if (typeof value !== 'string' || !COORD_SYSTEMS.has(value)) {
        throw new Error(`Invalid ${fieldName}: ${String(value)}. Must be one of wgs84, gcj02, bd09`);
    }
}

function cloneState(state: RasterSourceCrsState): RasterSourceCrsState {
    return {
        sourceId: state.sourceId,
        dataCrs: state.dataCrs,
        tileCrs: state.tileCrs,
        applyOutsideChina: state.applyOutsideChina,
        updatedAt: state.updatedAt
    };
}

export class RasterCrsRegistry {
    private _now: NowFn;
    private _states: Map<string, RasterSourceCrsState>;

    constructor(now: NowFn = () => Date.now()) {
        this._now = now;
        this._states = new Map();
    }

    set(sourceId: string, sourceType: string, options: RasterSourceCoordSystemOptions): RasterSourceCrsState {
        assertSourceId(sourceId);
        assertRasterSourceType(sourceType);

        const dataCrs = options?.dataCrs;
        const tileCrs = options?.tileCrs ?? dataCrs;
        const applyOutsideChina = options?.applyOutsideChina ?? false;

        assertCoordSystem(dataCrs, 'dataCrs');
        assertCoordSystem(tileCrs, 'tileCrs');

        const nextState: RasterSourceCrsState = {
            sourceId,
            dataCrs,
            tileCrs,
            applyOutsideChina,
            updatedAt: this._now()
        };

        this._states.set(sourceId, nextState);
        return cloneState(nextState);
    }

    getState(sourceId: string): RasterSourceCrsState | null {
        const state = this._states.get(sourceId);
        return state ? cloneState(state) : null;
    }

    getOptions(sourceId: string): RasterSourceCoordSystemOptions | null {
        const state = this._states.get(sourceId);
        if (!state) return null;

        return {
            dataCrs: state.dataCrs,
            tileCrs: state.tileCrs,
            applyOutsideChina: state.applyOutsideChina
        };
    }

    remove(sourceId: string): boolean {
        assertSourceId(sourceId);
        return this._states.delete(sourceId);
    }

    clear(): void {
        this._states.clear();
    }

    size(): number {
        return this._states.size;
    }
}
