import {describe, expect, test} from 'vitest';
import {
    bd09ToGcj02,
    bd09ToWgs84,
    gcj02ToBd09,
    gcj02ToWgs84,
    wgs84ToBd09,
    wgs84ToGcj02
} from './transform';

describe('coord_system/transform', () => {
    test('converts WGS84 to GCJ02 for a point in China', () => {
        const beijingWgs: [number, number] = [116.3975, 39.9087];
        const [lng, lat] = wgs84ToGcj02(beijingWgs);

        expect(lng).toBeCloseTo(116.4037, 3);
        expect(lat).toBeCloseTo(39.9101, 3);
    });

    test('does not offset outside China by default', () => {
        const londonWgs: [number, number] = [-0.1276, 51.5072];
        const result = wgs84ToGcj02(londonWgs);

        expect(result[0]).toBe(londonWgs[0]);
        expect(result[1]).toBe(londonWgs[1]);
    });

    test('can force offset outside China', () => {
        const londonWgs: [number, number] = [-0.1276, 51.5072];
        const forced = wgs84ToGcj02(londonWgs, {applyOutsideChina: true});

        expect(forced[0]).not.toBe(londonWgs[0]);
        expect(forced[1]).not.toBe(londonWgs[1]);
    });

    test('WGS84 <-> GCJ02 round-trip stays within tolerance', () => {
        const point: [number, number] = [121.4737, 31.2304];
        const gcj = wgs84ToGcj02(point);
        const wgs = gcj02ToWgs84(gcj);

        expect(Math.abs(wgs[0] - point[0])).toBeLessThan(0.0001);
        expect(Math.abs(wgs[1] - point[1])).toBeLessThan(0.0001);
    });

    test('GCJ02 <-> BD09 round-trip stays within high precision tolerance', () => {
        const point: [number, number] = [113.2644, 23.1291];
        const bd = gcj02ToBd09(point);
        const gcj = bd09ToGcj02(bd);

        expect(Math.abs(gcj[0] - point[0])).toBeLessThan(0.000001);
        expect(Math.abs(gcj[1] - point[1])).toBeLessThan(0.000001);
    });

    test('WGS84 <-> BD09 round-trip stays within tolerance', () => {
        const point: [number, number] = [114.0579, 22.5431];
        const bd = wgs84ToBd09(point);
        const wgs = bd09ToWgs84(bd);

        expect(Math.abs(wgs[0] - point[0])).toBeLessThan(0.00015);
        expect(Math.abs(wgs[1] - point[1])).toBeLessThan(0.00015);
    });

    test('throws for invalid coordinates', () => {
        expect(() => wgs84ToGcj02([NaN, 0])).toThrow('Invalid coordinate');
        expect(() => wgs84ToGcj02([181, 0])).toThrow('Invalid longitude value');
        expect(() => wgs84ToGcj02([0, -91])).toThrow('Invalid latitude value');
    });

    test('conversions are deterministic', () => {
        const point: [number, number] = [104.0665, 30.5728];
        const result1 = wgs84ToGcj02(point);
        const result2 = wgs84ToGcj02(point);
        const result3 = gcj02ToBd09(result1);
        const result4 = gcj02ToBd09(result1);

        expect(result1).toEqual(result2);
        expect(result3).toEqual(result4);
    });
});
