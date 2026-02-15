import {afterEach, describe, expect, test} from 'vitest';
import {EvaluationParameters} from '../../style/evaluation_parameters';
import {createProjectionFromName} from './projection_factory';
import {setProjectionSegregationMode, getProjectionSegregationMode} from './projection_config';
import {VerticalPerspectiveProjection} from './vertical_perspective_projection';
import {VerticalPerspectiveTransform} from './vertical_perspective_transform';
import {VerticalPerspectiveCameraHelper} from './vertical_perspective_camera_helper';
import {MercatorProjection} from './mercator_projection';
import {MercatorTransform} from './mercator_transform';
import {MercatorCameraHelper} from './mercator_camera_helper';
import {GlobeProjection} from './globe_projection';
import {GlobeTransform} from './globe_transform';
import {GlobeCameraHelper} from './globe_camera_helper';

const originalMode = getProjectionSegregationMode();

afterEach(() => {
    setProjectionSegregationMode(originalMode);
});

describe('projection factory - legacy-hybrid mode', () => {
    test('mercator creates pure Mercator pipeline', () => {
        setProjectionSegregationMode('legacy-hybrid');
        const result = createProjectionFromName('mercator');

        expect(result.projection).toBeInstanceOf(MercatorProjection);
        expect(result.transform).toBeInstanceOf(MercatorTransform);
        expect(result.cameraHelper).toBeInstanceOf(MercatorCameraHelper);
    });

    test('globe creates hybrid GlobeProjection pipeline', () => {
        setProjectionSegregationMode('legacy-hybrid');
        const result = createProjectionFromName('globe');

        expect(result.projection).toBeInstanceOf(GlobeProjection);
        expect(result.transform).toBeInstanceOf(GlobeTransform);
        expect(result.cameraHelper).toBeInstanceOf(GlobeCameraHelper);
    });

    test('globe hybrid transitions to mercator at high zoom', () => {
        setProjectionSegregationMode('legacy-hybrid');
        const {projection} = createProjectionFromName('globe');

        // At zoom 11, should be full globe (transitionState = 1)
        projection.recalculate(new EvaluationParameters(11));
        expect(projection.transitionState).toBe(1);

        // At zoom 11.5, should be mid-transition (transitionState ≈ 0.5)
        projection.recalculate(new EvaluationParameters(11.5));
        expect(projection.transitionState).toBeCloseTo(0.5, 5);

        // At zoom 12, should be full mercator (transitionState = 0)
        projection.recalculate(new EvaluationParameters(12));
        expect(projection.transitionState).toBe(0);
    });

    test('vertical-perspective creates pure VP pipeline', () => {
        setProjectionSegregationMode('legacy-hybrid');
        const result = createProjectionFromName('vertical-perspective');

        expect(result.projection).toBeInstanceOf(VerticalPerspectiveProjection);
        expect(result.transform).toBeInstanceOf(VerticalPerspectiveTransform);
        expect(result.cameraHelper).toBeInstanceOf(VerticalPerspectiveCameraHelper);
    });
});

describe('projection factory - strict mode', () => {
    test('mercator creates pure Mercator pipeline (unchanged)', () => {
        setProjectionSegregationMode('strict');
        const result = createProjectionFromName('mercator');

        expect(result.projection).toBeInstanceOf(MercatorProjection);
        expect(result.transform).toBeInstanceOf(MercatorTransform);
        expect(result.cameraHelper).toBeInstanceOf(MercatorCameraHelper);
    });

    test('globe creates GlobeProjection pipeline with strict enforcement', () => {
        setProjectionSegregationMode('strict');
        const result = createProjectionFromName('globe');

        // In strict mode, 'globe' still uses Globe* wrappers (for API compatibility)
        // but configured with fixed VP — no zoom-based transition.
        expect(result.projection).toBeInstanceOf(GlobeProjection);
        expect(result.transform).toBeInstanceOf(GlobeTransform);
        expect(result.cameraHelper).toBeInstanceOf(GlobeCameraHelper);

        // projection.name should still be 'globe' (not 'vertical-perspective')
        expect(result.projection.name).toBe('globe');
    });

    test('globe strict mode has transitionState always 1 at any zoom', () => {
        setProjectionSegregationMode('strict');
        const {projection} = createProjectionFromName('globe');

        // In strict mode, transitionState is always 1, even at high zoom
        // where legacy-hybrid would transition to mercator
        projection.recalculate(new EvaluationParameters(5));
        expect(projection.transitionState).toBe(1);

        projection.recalculate(new EvaluationParameters(12));
        expect(projection.transitionState).toBe(1);

        projection.recalculate(new EvaluationParameters(15));
        expect(projection.transitionState).toBe(1);
    });

    test('vertical-perspective creates pure VP pipeline (unchanged)', () => {
        setProjectionSegregationMode('strict');
        const result = createProjectionFromName('vertical-perspective');

        expect(result.projection).toBeInstanceOf(VerticalPerspectiveProjection);
        expect(result.transform).toBeInstanceOf(VerticalPerspectiveTransform);
        expect(result.cameraHelper).toBeInstanceOf(VerticalPerspectiveCameraHelper);
    });
});
