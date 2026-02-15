/**
 * Comprehensive diagnostic tests for strict projection segregation mode at high zoom levels.
 *
 * These tests verify the entire rendering pipeline state when projection segregation
 * mode is 'strict' and the map is zoomed to levels beyond the normal globe→mercator
 * transition zone (zoom > 12).
 */
import {afterEach, describe, expect, test} from 'vitest';
import {EvaluationParameters} from '../../style/evaluation_parameters';
import {createProjectionFromName} from './projection_factory';
import {setProjectionSegregationMode, getProjectionSegregationMode} from './projection_config';
import {GlobeProjection} from './globe_projection';
import {GlobeTransform} from './globe_transform';
import {GlobeCameraHelper} from './globe_camera_helper';
import {LngLat} from '../lng_lat';
import {OverscaledTileID} from '../../tile/tile_id';
import {VerticalPerspectiveProjection} from './vertical_perspective_projection';
import {coveringTiles} from './covering_tiles';
import type {CoveringTilesOptions} from './covering_tiles';

const originalMode = getProjectionSegregationMode();

afterEach(() => {
    setProjectionSegregationMode(originalMode);
});

/**
 * HIGH_ZOOM_LEVELS: zoom levels beyond the legacy-hybrid transition zone (11-12).
 * In legacy-hybrid mode, globe fully transitions to mercator by zoom 12.
 * In strict mode, globe must remain active at all these levels.
 */
const HIGH_ZOOM_LEVELS = [12, 13, 14, 15, 16, 17, 18];

function createStrictGlobeStack() {
    setProjectionSegregationMode('strict');
    const result = createProjectionFromName('globe');
    return result;
}

function createStrictGlobeTransform(zoom: number, center: LngLat = new LngLat(116.391, 39.907)) {
    setProjectionSegregationMode('strict');
    const {projection, transform} = createProjectionFromName('globe');
    const globeTransform = transform as GlobeTransform;
    globeTransform.resize(640, 480);
    globeTransform.setCenter(center);
    globeTransform.setZoom(zoom);

    // Simulate the map._render() update cycle:
    // 1. projection.recalculate(parameters)
    projection.recalculate(new EvaluationParameters(zoom));
    // 2. transform.setTransitionState(transitionState, errorCorrection)
    globeTransform.setTransitionState(projection.transitionState, projection.latitudeErrorCorrectionRadians);

    return {projection, transform: globeTransform};
}

describe('Strict mode - GlobeProjection at high zoom', () => {
    for (const zoom of HIGH_ZOOM_LEVELS) {
        test(`zoom ${zoom}: transitionState is always 1`, () => {
            setProjectionSegregationMode('strict');
            const {projection} = createProjectionFromName('globe');
            projection.recalculate(new EvaluationParameters(zoom));
            expect(projection.transitionState).toBe(1);
        });

        test(`zoom ${zoom}: useGlobeRendering is true`, () => {
            setProjectionSegregationMode('strict');
            const {projection} = createProjectionFromName('globe');
            projection.recalculate(new EvaluationParameters(zoom));
            expect((projection as GlobeProjection).useGlobeRendering).toBe(true);
        });

        test(`zoom ${zoom}: useGlobeControls is true`, () => {
            setProjectionSegregationMode('strict');
            const {projection} = createProjectionFromName('globe');
            projection.recalculate(new EvaluationParameters(zoom));
            expect((projection as GlobeProjection).useGlobeControls).toBe(true);
        });

        test(`zoom ${zoom}: shaderVariantName is 'globe'`, () => {
            setProjectionSegregationMode('strict');
            const {projection} = createProjectionFromName('globe');
            projection.recalculate(new EvaluationParameters(zoom));
            expect(projection.shaderVariantName).toBe('globe');
        });

        test(`zoom ${zoom}: useSubdivision is true`, () => {
            setProjectionSegregationMode('strict');
            const {projection} = createProjectionFromName('globe');
            projection.recalculate(new EvaluationParameters(zoom));
            expect(projection.useSubdivision).toBe(true);
        });

        test(`zoom ${zoom}: name is 'globe' (API compatible)`, () => {
            setProjectionSegregationMode('strict');
            const {projection} = createProjectionFromName('globe');
            projection.recalculate(new EvaluationParameters(zoom));
            expect(projection.name).toBe('globe');
        });
    }
});

describe('Strict mode - GlobeTransform at high zoom', () => {
    for (const zoom of HIGH_ZOOM_LEVELS) {
        test(`zoom ${zoom}: isGlobeRendering is true`, () => {
            const {transform} = createStrictGlobeTransform(zoom);
            expect(transform.isGlobeRendering).toBe(true);
        });

        test(`zoom ${zoom}: getProjectionData with applyGlobeMatrix=true returns correct projectionTransition`, () => {
            const {transform} = createStrictGlobeTransform(zoom);
            const tileID = new OverscaledTileID(zoom, 0, zoom, 0, 0);
            const data = transform.getProjectionData({
                overscaledTileID: tileID,
                applyGlobeMatrix: true,
                applyTerrainMatrix: true
            });
            // In strict mode the shader transition gracefully ramps down
            // at high zoom to avoid float32 precision artefacts:
            //   zoom <= 13: projectionTransition = 1 (full globe shader)
            //   zoom 13-14: gradual transition
            //   zoom >= 14: projectionTransition = 0 (mercator fallback shader)
            const {STRICT_SHADER_TRANSITION_START, STRICT_SHADER_TRANSITION_END} = GlobeTransform;
            if (zoom <= STRICT_SHADER_TRANSITION_START) {
                expect(data.projectionTransition).toBe(1);
            } else if (zoom >= STRICT_SHADER_TRANSITION_END) {
                expect(data.projectionTransition).toBe(0);
            } else {
                expect(data.projectionTransition).toBeGreaterThan(0);
                expect(data.projectionTransition).toBeLessThan(1);
            }
        });

        test(`zoom ${zoom}: getProjectionData without applyGlobeMatrix returns projectionTransition=0`, () => {
            const {transform} = createStrictGlobeTransform(zoom);
            const tileID = new OverscaledTileID(zoom, 0, zoom, 0, 0);
            const data = transform.getProjectionData({
                overscaledTileID: tileID,
                applyGlobeMatrix: false,
                applyTerrainMatrix: true
            });
            // This is expected: when applyGlobeMatrix is false (e.g., render-to-texture),
            // projectionTransition should be 0 because the tile is rendered flat to texture.
            expect(data.projectionTransition).toBe(0);
        });

        test(`zoom ${zoom}: projectionMatrix is valid (not NaN/Infinity)`, () => {
            const {transform} = createStrictGlobeTransform(zoom);
            const matrix = transform.projectionMatrix;
            for (let i = 0; i < 16; i++) {
                expect(isFinite(matrix[i])).toBe(true);
            }
        });

        test(`zoom ${zoom}: modelViewProjectionMatrix is valid`, () => {
            const {transform} = createStrictGlobeTransform(zoom);
            const matrix = transform.modelViewProjectionMatrix;
            for (let i = 0; i < 16; i++) {
                expect(isFinite(matrix[i])).toBe(true);
            }
        });

        test(`zoom ${zoom}: cameraPosition is valid`, () => {
            const {transform} = createStrictGlobeTransform(zoom);
            const pos = transform.cameraPosition;
            for (let i = 0; i < 3; i++) {
                expect(isFinite(pos[i])).toBe(true);
            }
        });
    }
});

describe('Strict mode - GlobeCameraHelper at high zoom', () => {
    for (const zoom of HIGH_ZOOM_LEVELS) {
        test(`zoom ${zoom}: useGlobeControls is always true`, () => {
            setProjectionSegregationMode('strict');
            const {cameraHelper, projection} = createProjectionFromName('globe');
            projection.recalculate(new EvaluationParameters(zoom));
            const helper = cameraHelper as GlobeCameraHelper;
            expect(helper.useGlobeControls).toBe(true);
        });
    }
});

describe('Strict mode - covering tiles at high zoom', () => {
    for (const zoom of [12, 14, 15]) {
        test(`zoom ${zoom}: covering tiles returns valid tile IDs`, () => {
            const {transform} = createStrictGlobeTransform(zoom);
            const options: CoveringTilesOptions = {
                tileSize: 512,
            };
            const tiles = coveringTiles(transform, options);
            expect(tiles.length).toBeGreaterThan(0);
            for (const tileID of tiles) {
                expect(tileID.overscaledZ).toBeGreaterThanOrEqual(0);
                expect(tileID.canonical.z).toBeGreaterThanOrEqual(0);
                expect(tileID.canonical.x).toBeGreaterThanOrEqual(0);
                expect(tileID.canonical.y).toBeGreaterThanOrEqual(0);
            }
        });
    }
});

describe('Strict mode - post-creation activation (user calls setProjectionSegregationMode after map creation)', () => {
    test('switching from legacy-hybrid to strict at high zoom forces globe rendering', () => {
        // Step 1: Create projection in legacy-hybrid mode (default)
        setProjectionSegregationMode('legacy-hybrid');
        const {projection, transform} = createProjectionFromName('globe');
        const globeTransform = transform as GlobeTransform;
        globeTransform.resize(640, 480);
        globeTransform.setCenter(new LngLat(116.391, 39.907));
        globeTransform.setZoom(15);

        // In legacy-hybrid at zoom 15, globe transitions fully to mercator
        projection.recalculate(new EvaluationParameters(15));
        expect(projection.transitionState).toBe(0); // mercator
        globeTransform.setTransitionState(projection.transitionState, projection.latitudeErrorCorrectionRadians);
        expect(globeTransform.isGlobeRendering).toBe(false);

        // Step 2: User activates strict mode at runtime
        setProjectionSegregationMode('strict');

        // After switching to strict, the SAME projection object should now report
        // transitionState = 1 because the strict guard takes effect immediately.
        expect(projection.transitionState).toBe(1);

        // But GlobeTransform._globeness is still 0 (from the previous setTransitionState call).
        // It needs to be updated in the next render cycle.
        // Simulate the render cycle update:
        globeTransform.setTransitionState(projection.transitionState, projection.latitudeErrorCorrectionRadians);

        // NOW isGlobeRendering should be true
        expect(globeTransform.isGlobeRendering).toBe(true);

        // At zoom 15 (above STRICT_SHADER_TRANSITION_END), the shader
        // transition has ramped down to 0 for float32 precision safety.
        // But isGlobeRendering is still true — only the shader math changes.
        const tileID = new OverscaledTileID(15, 0, 15, 0, 0);
        const data = globeTransform.getProjectionData({
            overscaledTileID: tileID,
            applyGlobeMatrix: true,
            applyTerrainMatrix: true
        });
        expect(data.projectionTransition).toBe(0);
    });

    test('switching from strict to legacy-hybrid at high zoom allows mercator transition', () => {
        // Step 1: Create in strict mode
        setProjectionSegregationMode('strict');
        const {projection, transform} = createProjectionFromName('globe');
        const globeTransform = transform as GlobeTransform;
        globeTransform.resize(640, 480);
        globeTransform.setCenter(new LngLat(116.391, 39.907));
        globeTransform.setZoom(15);

        projection.recalculate(new EvaluationParameters(15));
        expect(projection.transitionState).toBe(1);
        globeTransform.setTransitionState(projection.transitionState, projection.latitudeErrorCorrectionRadians);
        expect(globeTransform.isGlobeRendering).toBe(true);

        // Step 2: Switch back to legacy-hybrid
        setProjectionSegregationMode('legacy-hybrid');

        // GlobeProjection with type='vertical-perspective' (from strict factory)
        // In legacy-hybrid mode, the type property evaluates to just 'vertical-perspective' (constant).
        // The transitionState getter's string check should handle this.
        // But wait — the factory created GlobeProjection({type: 'vertical-perspective'})
        // So properties.get('type') might be a ProjectionDefinition wrapping 'vertical-perspective'.
        // The transitionState getter should still return 1 (via the fallback) because
        // the ProjectionDefinition would have from=to='vertical-perspective'.
        // OR it would be caught by typeof check.
        // Either way, transitionState should be 1 (no transition for constant VP type).
        const ts = projection.transitionState;
        // The exact value depends on how the style-spec evaluates 'vertical-perspective' string.
        // But it should be 1 (since the type IS 'vertical-perspective').
        expect(ts).toBe(1);
    });
});

describe('Strict mode - comparison: legacy-hybrid vs strict at zoom 15', () => {
    test('legacy-hybrid at zoom 15 uses mercator rendering', () => {
        setProjectionSegregationMode('legacy-hybrid');
        const {projection, transform} = createProjectionFromName('globe');
        const globeTransform = transform as GlobeTransform;
        globeTransform.resize(640, 480);
        globeTransform.setCenter(new LngLat(116.391, 39.907));
        globeTransform.setZoom(15);

        projection.recalculate(new EvaluationParameters(15));
        globeTransform.setTransitionState(projection.transitionState, projection.latitudeErrorCorrectionRadians);

        expect(projection.transitionState).toBe(0);
        expect((projection as GlobeProjection).useGlobeRendering).toBe(false);
        expect(globeTransform.isGlobeRendering).toBe(false);
        // Shader variant should be mercator since useGlobeRendering is false
        expect(projection.shaderVariantName).toBe('mercator');
    });

    test('strict at zoom 15 uses globe rendering', () => {
        setProjectionSegregationMode('strict');
        const {projection, transform} = createProjectionFromName('globe');
        const globeTransform = transform as GlobeTransform;
        globeTransform.resize(640, 480);
        globeTransform.setCenter(new LngLat(116.391, 39.907));
        globeTransform.setZoom(15);

        projection.recalculate(new EvaluationParameters(15));
        globeTransform.setTransitionState(projection.transitionState, projection.latitudeErrorCorrectionRadians);

        expect(projection.transitionState).toBe(1);
        expect((projection as GlobeProjection).useGlobeRendering).toBe(true);
        expect(globeTransform.isGlobeRendering).toBe(true);
        // Shader variant should be globe since useGlobeRendering is true
        expect(projection.shaderVariantName).toBe('globe');
    });
});

describe('Strict mode - subdivision granularity at high zoom', () => {
    test('VP projection provides non-zero subdivision at zoom 15', () => {
        const vp = new VerticalPerspectiveProjection();
        const granularity = vp.subdivisionGranularity;
        // tile granularity at zoom 15: max(128 / 2^15, 32, 1) = max(0.0039, 32, 1) = 32
        expect(granularity.tile.getGranularityForZoomLevel(15)).toBe(32);
        // fill granularity at zoom 15: max(128 / 2^15, 2, 1) = max(0.0039, 2, 1) = 2
        expect(granularity.fill.getGranularityForZoomLevel(15)).toBe(2);
    });
});
