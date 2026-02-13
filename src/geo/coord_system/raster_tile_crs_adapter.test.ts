import {describe, expect, test} from 'vitest';
import {CanonicalTileID} from '../../tile/tile_id';
import {RasterTileCrsAdapter} from './raster_tile_crs_adapter';

describe('coord_system/raster_tile_crs_adapter', () => {
    test('keeps tile id unchanged and render offset empty when target tile CRS is wgs84', () => {
        const original = new CanonicalTileID(12, 3371, 1553);

        const mapping = RasterTileCrsAdapter.mapCanonicalTileIDWithRenderOffset(original, {
            dataCrs: 'wgs84'
        });

        expect(mapping.tileID).toBe(original);
        expect(mapping.renderOffset).toEqual([0, 0]);
    });

    test('returns fractional render offset for GCJ02 raster tiles in China', () => {
        const original = new CanonicalTileID(15, 26085, 13565);

        const mapping = RasterTileCrsAdapter.mapCanonicalTileIDWithRenderOffset(original, {
            dataCrs: 'gcj02',
            tileCrs: 'gcj02'
        });

        expect(mapping.tileID).toBe(original);
        expect(Math.abs(mapping.renderOffset[0])).toBeGreaterThan(0.01);
        expect(Math.abs(mapping.renderOffset[1])).toBeGreaterThan(0.01);
    });

    test('keeps offset empty outside China when applyOutsideChina is false', () => {
        const original = new CanonicalTileID(16, 10482, 25331);

        const mapping = RasterTileCrsAdapter.mapCanonicalTileIDWithRenderOffset(original, {
            dataCrs: 'gcj02',
            tileCrs: 'gcj02',
            applyOutsideChina: false
        });

        expect(mapping.tileID).toBe(original);
        expect(mapping.renderOffset).toEqual([0, 0]);
    });

    test('can apply offset outside China when applyOutsideChina is true', () => {
        const original = new CanonicalTileID(16, 10482, 25331);

        const mapping = RasterTileCrsAdapter.mapCanonicalTileIDWithRenderOffset(original, {
            dataCrs: 'gcj02',
            tileCrs: 'gcj02',
            applyOutsideChina: true
        });

        expect(mapping.tileID.z).toBe(16);
        expect(mapping.tileID.equals(original)).toBe(false);
        expect(Math.abs(mapping.renderOffset[0])).toBeGreaterThan(0.01);
        expect(Math.abs(mapping.renderOffset[1])).toBeGreaterThan(0.01);
    });

    test('keeps low-zoom CRS shift continuous for Chongqing sample across z15/z16', () => {
        const z15 = new CanonicalTileID(15, 26085, 13565);
        const z16 = new CanonicalTileID(16, 52171, 27130);

        const z15Mapping = RasterTileCrsAdapter.mapCanonicalTileIDWithRenderOffset(z15, {
            dataCrs: 'gcj02',
            tileCrs: 'gcj02',
            applyOutsideChina: true
        });
        const z16Mapping = RasterTileCrsAdapter.mapCanonicalTileIDWithRenderOffset(z16, {
            dataCrs: 'gcj02',
            tileCrs: 'gcj02',
            applyOutsideChina: true
        });

        const z15Shift = (z15Mapping.tileID.x - z15.x) - z15Mapping.renderOffset[0];
        const z16Shift = (z16Mapping.tileID.x - z16.x) - z16Mapping.renderOffset[0];

        expect(z15Shift).toBeGreaterThan(0.1);
        expect(z16Shift).toBeGreaterThan(0.1);
        expect(Math.abs(z16Shift - z15Shift * 2)).toBeLessThan(0.2);
    });
});
