/**
 * Internal projection segregation mode configuration.
 *
 * Controls whether the Globe projection uses the legacy hybrid approach
 * (auto-transitioning between VerticalPerspective and Mercator based on zoom)
 * or the strict approach (pure single-pipeline rendering).
 *
 * This is an internal configuration, not exposed as a public API.
 *
 * @internal
 */

export type ProjectionSegregationMode = 'legacy-hybrid' | 'strict';

/**
 * Runtime state that tracks the relationship between configured and active projection.
 * In `strict` mode, `activeProjection === configuredProjection` is always true.
 *
 * @internal
 */
export interface ProjectionRuntimeState {
    configuredProjection: 'mercator' | 'globe' | 'vertical-perspective';
    activeProjection: 'mercator' | 'globe' | 'vertical-perspective';
    segregationMode: ProjectionSegregationMode;
}

let _segregationMode: ProjectionSegregationMode = 'legacy-hybrid';

/**
 * Get the current projection segregation mode.
 * @internal
 */
export function getProjectionSegregationMode(): ProjectionSegregationMode {
    return _segregationMode;
}

/**
 * Set the projection segregation mode.
 * - `'legacy-hybrid'`: Globe transitions to Mercator at high zoom (current behavior).
 * - `'strict'`: Globe always uses pure VerticalPerspective pipeline, Mercator always uses pure Mercator pipeline.
 *
 * @internal
 */
export function setProjectionSegregationMode(mode: ProjectionSegregationMode): void {
    _segregationMode = mode;
}
