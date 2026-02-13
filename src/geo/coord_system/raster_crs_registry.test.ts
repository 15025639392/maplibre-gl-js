import {describe, expect, test} from 'vitest';
import {RasterCrsRegistry} from './raster_crs_registry';

describe('coord_system/raster_crs_registry', () => {
    test('sets and gets source CRS options', () => {
        const registry = new RasterCrsRegistry(() => 123);

        const state = registry.set('base-map', 'raster', {
            dataCrs: 'gcj02',
            tileCrs: 'bd09',
            applyOutsideChina: true
        });

        expect(state).toEqual({
            sourceId: 'base-map',
            dataCrs: 'gcj02',
            tileCrs: 'bd09',
            applyOutsideChina: true,
            updatedAt: 123
        });

        expect(registry.getOptions('base-map')).toEqual({
            dataCrs: 'gcj02',
            tileCrs: 'bd09',
            applyOutsideChina: true
        });
    });

    test('uses defaults for tileCrs and applyOutsideChina', () => {
        const registry = new RasterCrsRegistry(() => 1);

        const state = registry.set('r1', 'raster', {
            dataCrs: 'wgs84'
        });

        expect(state.tileCrs).toBe('wgs84');
        expect(state.applyOutsideChina).toBe(false);
    });

    test('accepts raster-dem source type', () => {
        const registry = new RasterCrsRegistry(() => 1);

        expect(() => {
            registry.set('terrain', 'raster-dem', {dataCrs: 'wgs84'});
        }).not.toThrow();
    });

    test('returns clones so callers cannot mutate internal state', () => {
        const registry = new RasterCrsRegistry(() => 100);
        const state = registry.set('s1', 'raster', {dataCrs: 'gcj02'});
        state.dataCrs = 'wgs84';

        const options = registry.getOptions('s1');
        options.dataCrs = 'bd09';

        expect(registry.getState('s1')).toEqual({
            sourceId: 's1',
            dataCrs: 'gcj02',
            tileCrs: 'gcj02',
            applyOutsideChina: false,
            updatedAt: 100
        });
    });

    test('removes and clears states', () => {
        const registry = new RasterCrsRegistry(() => 1);
        registry.set('s1', 'raster', {dataCrs: 'wgs84'});
        registry.set('s2', 'raster-dem', {dataCrs: 'gcj02'});

        expect(registry.size()).toBe(2);
        expect(registry.remove('s1')).toBe(true);
        expect(registry.getState('s1')).toBeNull();
        expect(registry.size()).toBe(1);

        registry.clear();
        expect(registry.size()).toBe(0);
    });

    test('throws for invalid source type, sourceId or coordinate system', () => {
        const registry = new RasterCrsRegistry(() => 1);

        expect(() => {
            registry.set('id', 'vector', {dataCrs: 'wgs84'} as any);
        }).toThrow('Only raster and raster-dem are supported');

        expect(() => {
            registry.set('', 'raster', {dataCrs: 'wgs84'});
        }).toThrow('Invalid sourceId');

        expect(() => {
            registry.set('id2', 'raster', {dataCrs: 'epsg3857' as any});
        }).toThrow('Invalid dataCrs');
    });
});
