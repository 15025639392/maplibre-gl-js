import {afterEach, describe, expect, test} from 'vitest';
import {GlobeCameraHelper} from './globe_camera_helper';
import {GlobeProjection} from './globe_projection';
import {EvaluationParameters} from '../../style/evaluation_parameters';
import {setProjectionSegregationMode, getProjectionSegregationMode} from './projection_config';

const originalMode = getProjectionSegregationMode();

afterEach(() => {
    setProjectionSegregationMode(originalMode);
});

describe('GlobeCameraHelper - legacy-hybrid mode', () => {
    test('useGlobeControls follows globe projection rendering state', () => {
        setProjectionSegregationMode('legacy-hybrid');
        const projection = new GlobeProjection({type: [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,
            'vertical-perspective',
            12,
            'mercator'
        ]});
        const helper = new GlobeCameraHelper(projection);

        // At zoom 10, globe rendering is active
        projection.recalculate(new EvaluationParameters(10));
        expect(helper.useGlobeControls).toBe(true);

        // At zoom 12, mercator rendering is active
        projection.recalculate(new EvaluationParameters(12));
        expect(helper.useGlobeControls).toBe(false);
    });
});

describe('GlobeCameraHelper - strict mode', () => {
    test('useGlobeControls is always true regardless of zoom', () => {
        setProjectionSegregationMode('strict');
        const projection = new GlobeProjection({type: [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,
            'vertical-perspective',
            12,
            'mercator'
        ]});
        const helper = new GlobeCameraHelper(projection);

        // At zoom 10, globe controls should be active
        projection.recalculate(new EvaluationParameters(10));
        expect(helper.useGlobeControls).toBe(true);

        // At zoom 12, globe controls should STILL be active in strict mode
        projection.recalculate(new EvaluationParameters(12));
        expect(helper.useGlobeControls).toBe(true);

        // At zoom 15, still active
        projection.recalculate(new EvaluationParameters(15));
        expect(helper.useGlobeControls).toBe(true);
    });
});
