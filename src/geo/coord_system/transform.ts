import {isInChina} from './china_boundary';
import type {CoordTransformOptions, LngLatTuple} from './types';
import {assertValidLngLat} from './types';

const PI = Math.PI;
const X_PI = PI * 3000.0 / 180.0;
const A = 6378245.0;
const EE = 0.00669342162296594323;

function transformLatitude(x: number, y: number): number {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformLongitude(x: number, y: number): number {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
}

function shouldBypassOffset(lngLat: LngLatTuple, options?: CoordTransformOptions): boolean {
    return !options?.applyOutsideChina && !isInChina(lngLat);
}

function convertUsingGcjOffset(lngLat: LngLatTuple): LngLatTuple {
    const [lng, lat] = lngLat;
    const dLat = transformLatitude(lng - 105.0, lat - 35.0);
    const dLng = transformLongitude(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);

    const mgLat = lat + (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
    const mgLng = lng + (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);

    return [mgLng, mgLat];
}

export function wgs84ToGcj02(lngLat: LngLatTuple, options?: CoordTransformOptions): LngLatTuple {
    assertValidLngLat(lngLat);
    if (shouldBypassOffset(lngLat, options)) {
        return [lngLat[0], lngLat[1]];
    }

    return convertUsingGcjOffset(lngLat);
}

export function gcj02ToWgs84(lngLat: LngLatTuple, options?: CoordTransformOptions): LngLatTuple {
    assertValidLngLat(lngLat);
    if (shouldBypassOffset(lngLat, options)) {
        return [lngLat[0], lngLat[1]];
    }

    const [lng, lat] = lngLat;
    const [mgLng, mgLat] = convertUsingGcjOffset(lngLat);
    return [lng * 2 - mgLng, lat * 2 - mgLat];
}

export function gcj02ToBd09(lngLat: LngLatTuple): LngLatTuple {
    assertValidLngLat(lngLat);
    const [lng, lat] = lngLat;

    const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI);
    const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI);

    const bdLng = z * Math.cos(theta) + 0.0065;
    const bdLat = z * Math.sin(theta) + 0.006;
    return [bdLng, bdLat];
}

export function bd09ToGcj02(lngLat: LngLatTuple): LngLatTuple {
    assertValidLngLat(lngLat);
    const [lng, lat] = lngLat;

    const x = lng - 0.0065;
    const y = lat - 0.006;
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);

    const gcjLng = z * Math.cos(theta);
    const gcjLat = z * Math.sin(theta);
    return [gcjLng, gcjLat];
}

export function wgs84ToBd09(lngLat: LngLatTuple, options?: CoordTransformOptions): LngLatTuple {
    return gcj02ToBd09(wgs84ToGcj02(lngLat, options));
}

export function bd09ToWgs84(lngLat: LngLatTuple, options?: CoordTransformOptions): LngLatTuple {
    return gcj02ToWgs84(bd09ToGcj02(lngLat), options);
}
