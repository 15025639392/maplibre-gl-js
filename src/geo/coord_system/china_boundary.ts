import type {LngLatTuple} from './types';
import {assertValidLngLat} from './types';

const CHINA_MIN_LNG = 72.004;
const CHINA_MAX_LNG = 137.8347;
const CHINA_MIN_LAT = 0.8293;
const CHINA_MAX_LAT = 55.8271;

export function isInChina(lngLat: LngLatTuple): boolean {
    assertValidLngLat(lngLat);

    const [lng, lat] = lngLat;
    return lng >= CHINA_MIN_LNG && lng <= CHINA_MAX_LNG && lat >= CHINA_MIN_LAT && lat <= CHINA_MAX_LAT;
}
