import {afterEach, describe, expect, test} from 'vitest';
import {EvaluationParameters} from '../../style/evaluation_parameters';
import {GlobeProjection} from './globe_projection';
import {setProjectionSegregationMode, getProjectionSegregationMode} from './projection_config';

const originalMode = getProjectionSegregationMode();

afterEach(() => {
    setProjectionSegregationMode(originalMode);
});

describe('GlobeProjection - legacy-hybrid mode', () => {
    test('transitionState follows zoom interpolation', () => {
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

        projection.recalculate(new EvaluationParameters(10));
        expect(projection.transitionState).toBe(1);
        expect(projection.useGlobeRendering).toBe(true);

        projection.recalculate(new EvaluationParameters(11.5));
        expect(projection.transitionState).toBeCloseTo(0.5, 5);
        expect(projection.useGlobeRendering).toBe(true);

        projection.recalculate(new EvaluationParameters(12));
        expect(projection.transitionState).toBe(0);
        expect(projection.useGlobeRendering).toBe(false);
    });

    test('useGlobeControls follows transitionState', () => {
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

        projection.recalculate(new EvaluationParameters(10));
        expect(projection.useGlobeControls).toBe(true);

        projection.recalculate(new EvaluationParameters(12));
        expect(projection.useGlobeControls).toBe(false);
    });

    test('high zoom transitions fully to mercator (transitionState 0)', () => {
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

        projection.recalculate(new EvaluationParameters(13));
        expect(projection.transitionState).toBe(0);
        expect(projection.useGlobeRendering).toBe(false);
    });

    test('low zoom stays fully globe (transitionState 1)', () => {
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

        projection.recalculate(new EvaluationParameters(5));
        expect(projection.transitionState).toBe(1);
        expect(projection.useGlobeRendering).toBe(true);
    });
});

describe('GlobeProjection - strict mode', () => {
    test('transitionState is always 1 regardless of zoom', () => {
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

        projection.recalculate(new EvaluationParameters(10));
        expect(projection.transitionState).toBe(1);

        projection.recalculate(new EvaluationParameters(11.5));
        expect(projection.transitionState).toBe(1);

        projection.recalculate(new EvaluationParameters(12));
        expect(projection.transitionState).toBe(1);

        projection.recalculate(new EvaluationParameters(15));
        expect(projection.transitionState).toBe(1);
    });

    test('useGlobeRendering is always true in strict mode', () => {
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

        projection.recalculate(new EvaluationParameters(12));
        expect(projection.useGlobeRendering).toBe(true);
    });

    test('useGlobeControls is always true in strict mode', () => {
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

        projection.recalculate(new EvaluationParameters(12));
        expect(projection.useGlobeControls).toBe(true);
    });

    test('name always returns globe', () => {
        setProjectionSegregationMode('strict');
        const projection = new GlobeProjection({type: 'vertical-perspective'});

        expect(projection.name).toBe('globe');
    });
});
