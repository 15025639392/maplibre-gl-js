import type {mat2, mat4, vec3, vec4} from 'gl-matrix';
import {TransformHelper} from '../transform_helper';
import {MercatorTransform} from './mercator_transform';
import {VerticalPerspectiveTransform} from './vertical_perspective_transform';
import {type LngLat, type LngLatLike,} from '../lng_lat';
import {lerp} from '../../util/util';
import {getProjectionSegregationMode} from './projection_config';
import type {OverscaledTileID, UnwrappedTileID, CanonicalTileID} from '../../tile/tile_id';

import type Point from '@mapbox/point-geometry';
import type {MercatorCoordinate} from '../mercator_coordinate';
import type {LngLatBounds} from '../lng_lat_bounds';
import type {Frustum} from '../../util/primitives/frustum';
import type {Terrain} from '../../render/terrain';
import type {PointProjection} from '../../symbol/projection';
import type {IReadonlyTransform, ITransform, TransformConstrainFunction} from '../transform_interface';
import type {TransformOptions} from '../transform_helper';
import type {PaddingOptions} from '../edge_insets';
import type {ProjectionData, ProjectionDataParams} from './projection_data';
import type {CoveringTilesDetailsProvider} from './covering_tiles_details_provider';

/**
 * Globe transform is a transform that moves between vertical perspective and mercator projections.
 */
export class GlobeTransform implements ITransform {
    private _helper: TransformHelper;

    //
    // Implementation of transform getters and setters
    //

    get pixelsToClipSpaceMatrix(): mat4 {
        return this._helper.pixelsToClipSpaceMatrix;
    }
    get clipSpaceToPixelsMatrix(): mat4 {
        return this._helper.clipSpaceToPixelsMatrix;
    }
    get pixelsToGLUnits(): [number, number] {
        return this._helper.pixelsToGLUnits;
    }
    get centerOffset(): Point {
        return this._helper.centerOffset;
    }
    get size(): Point {
        return this._helper.size;
    }
    get rotationMatrix(): mat2 {
        return this._helper.rotationMatrix;
    }
    get centerPoint(): Point {
        return this._helper.centerPoint;
    }
    get pixelsPerMeter(): number {
        return this._helper.pixelsPerMeter;
    }
    setMinZoom(zoom: number): void {
        this._helper.setMinZoom(zoom);
    }
    setMaxZoom(zoom: number): void {
        this._helper.setMaxZoom(zoom);
    }
    setMinPitch(pitch: number): void {
        this._helper.setMinPitch(pitch);
    }
    setMaxPitch(pitch: number): void {
        this._helper.setMaxPitch(pitch);
    }
    setRenderWorldCopies(renderWorldCopies: boolean): void {
        this._helper.setRenderWorldCopies(renderWorldCopies);
    }
    setBearing(bearing: number): void {
        this._helper.setBearing(bearing);
    }
    setPitch(pitch: number): void {
        this._helper.setPitch(pitch);
    }
    setRoll(roll: number): void {
        this._helper.setRoll(roll);
    }
    setFov(fov: number): void {
        this._helper.setFov(fov);
    }
    setZoom(zoom: number): void {
        this._helper.setZoom(zoom);
    }
    setCenter(center: LngLat): void {
        this._helper.setCenter(center);
    }
    setElevation(elevation: number): void {
        this._helper.setElevation(elevation);
    }
    setMinElevationForCurrentTile(elevation: number): void {
        this._helper.setMinElevationForCurrentTile(elevation);
    }
    setPadding(padding: PaddingOptions): void {
        this._helper.setPadding(padding);
    }
    interpolatePadding(start: PaddingOptions, target: PaddingOptions, t: number): void {
        return this._helper.interpolatePadding(start, target, t);
    }
    isPaddingEqual(padding: PaddingOptions): boolean {
        return this._helper.isPaddingEqual(padding);
    }
    resize(width: number, height: number, constrainTransform: boolean = true): void {
        this._helper.resize(width, height, constrainTransform);
    }
    getMaxBounds(): LngLatBounds {
        return this._helper.getMaxBounds();
    }
    setMaxBounds(bounds?: LngLatBounds): void {
        this._helper.setMaxBounds(bounds);
    }
    setConstrainOverride(constrain?: TransformConstrainFunction | null): void {
        this._helper.setConstrainOverride(constrain);
    }
    overrideNearFarZ(nearZ: number, farZ: number): void {
        this._helper.overrideNearFarZ(nearZ, farZ);
    }
    clearNearFarZOverride(): void {
        this._helper.clearNearFarZOverride();
    }
    getCameraQueryGeometry(queryGeometry: Point[]): Point[] {
        return this._helper.getCameraQueryGeometry(this.getCameraPoint(), queryGeometry);
    }

    get tileSize(): number {
        return this._helper.tileSize;
    }
    get tileZoom(): number {
        return this._helper.tileZoom;
    }
    get scale(): number {
        return this._helper.scale;
    }
    get worldSize(): number {
        return this._helper.worldSize;
    }
    get width(): number {
        return this._helper.width;
    }
    get height(): number {
        return this._helper.height;
    }
    get lngRange(): [number, number] {
        return this._helper.lngRange;
    }
    get latRange(): [number, number] {
        return this._helper.latRange;
    }
    get minZoom(): number {
        return this._helper.minZoom;
    }
    get maxZoom(): number {
        return this._helper.maxZoom;
    }
    get zoom(): number {
        return this._helper.zoom;
    }
    get center(): LngLat {
        return this._helper.center;
    }
    get minPitch(): number {
        return this._helper.minPitch;
    }
    get maxPitch(): number {
        return this._helper.maxPitch;
    }
    get pitch(): number {
        return this._helper.pitch;
    }
    get pitchInRadians(): number {
        return this._helper.pitchInRadians;
    }
    get roll(): number {
        return this._helper.roll;
    }
    get rollInRadians(): number {
        return this._helper.rollInRadians;
    }
    get bearing(): number {
        return this._helper.bearing;
    }
    get bearingInRadians(): number {
        return this._helper.bearingInRadians;
    }
    get fov(): number {
        return this._helper.fov;
    }
    get fovInRadians(): number {
        return this._helper.fovInRadians;
    }
    get elevation(): number {
        return this._helper.elevation;
    }
    get minElevationForCurrentTile(): number {
        return this._helper.minElevationForCurrentTile;
    }
    get padding(): PaddingOptions {
        return this._helper.padding;
    }
    get unmodified(): boolean {
        return this._helper.unmodified;
    }
    get renderWorldCopies(): boolean {
        return this._helper.renderWorldCopies;
    }
    get cameraToCenterDistance(): number {
        return this._helper.cameraToCenterDistance;
    }
    get constrainOverride(): TransformConstrainFunction {
        return this._helper.constrainOverride;
    }
    public get nearZ(): number { 
        return this._helper.nearZ; 
    }
    public get farZ(): number { 
        return this._helper.farZ; 
    }
    public get autoCalculateNearFarZ(): boolean { 
        return this._helper.autoCalculateNearFarZ; 
    }
    //
    // Implementation of globe transform
    //

    private _globeLatitudeErrorCorrectionRadians: number = 0;

    /**
     * True when globe render path should be used instead of the old but simpler mercator rendering.
     * Globe automatically transitions to mercator at high zoom levels, which causes a switch from
     * globe to mercator render path.
     */
    get isGlobeRendering(): boolean {
        return this._globeness > 0;
    }

    setTransitionState(globeness: number, errorCorrectionValue: number): void {
        // In strict mode, globeness is always 1 — no transition to Mercator.
        if (getProjectionSegregationMode() === 'strict') {
            this._globeness = 1;
        } else {
            this._globeness = globeness;
        }
        this._globeLatitudeErrorCorrectionRadians = errorCorrectionValue;
        this._calcMatrices();
        this._verticalPerspectiveTransform.getCoveringTilesDetailsProvider().prepareNextFrame();
        this._mercatorTransform.getCoveringTilesDetailsProvider().prepareNextFrame();
    }

    /**
     * Whether the strict-mode high-zoom mercator fallback is active.
     *
     * When true the internal rendering pipeline (covering tiles, frustum
     * culling, screen-to-location, near/far Z) uses the mercator
     * transform while the *shader* handles the visual VP→mercator
     * transition via `_computeShaderTransition`.
     *
     * The switch happens at {@link STRICT_SHADER_TRANSITION_START}
     * (the moment the shader begins blending), **not** at
     * {@link STRICT_SHADER_TRANSITION_END}.  Switching at the START
     * ensures the internal pipeline is consistent with the shader
     * throughout the entire transition zone — avoiding:
     *
     * - VP covering-tiles selecting a different set of tiles than what
     *   the partially-mercator shader expects → seams / missing tiles
     * - VP's extreme near/far Z polluting the depth buffer during the
     *   blend → flickering
     * - A hard near/far-Z jump at the END boundary → ground-plane
     *   discontinuity ("远处地坪线突变")
     */
    private _isHighZoomMercatorFallback(): boolean {
        return getProjectionSegregationMode() === 'strict'
            && this.zoom >= GlobeTransform.STRICT_SHADER_TRANSITION_START;
    }

    /**
     * The active internal transform for covering-tiles, frustum culling,
     * screen-to-location math and other rendering internals.
     *
     * In strict mode at high zoom (≥ {@link STRICT_SHADER_TRANSITION_START})
     * the shader is transitioning to (or has completed) mercator math,
     * so we also switch the internal pipeline to the mercator transform.
     */
    private get currentTransform(): ITransform {
        if (this.isGlobeRendering && this._isHighZoomMercatorFallback()) {
            return this._mercatorTransform;
        }
        return this.isGlobeRendering ? this._verticalPerspectiveTransform : this._mercatorTransform;
    }

    /**
     * Globe projection can smoothly interpolate between globe view and mercator. This variable controls this interpolation.
     * Value 0 is mercator, value 1 is globe, anything between is an interpolation between the two projections.
     */
    private _globeness: number = 1.0;
    private _mercatorTransform: MercatorTransform;
    private _verticalPerspectiveTransform: VerticalPerspectiveTransform;

    public constructor(options?: TransformOptions) {
        this._helper = new TransformHelper({
            calcMatrices: () => { this._calcMatrices(); },
            defaultConstrain: (center, zoom) => { return this.defaultConstrain(center, zoom); }
        }, options);
        this._globeness = 1; // When transform is cloned for use in symbols, `_updateAnimation` function which usually sets this value never gets called.
        this._mercatorTransform = new MercatorTransform();
        this._verticalPerspectiveTransform = new VerticalPerspectiveTransform();
    }

    clone(): ITransform {
        const clone = new GlobeTransform();
        clone._globeness = this._globeness;
        clone._globeLatitudeErrorCorrectionRadians = this._globeLatitudeErrorCorrectionRadians;
        clone.apply(this, false);
        return clone;
    }

    public apply(that: IReadonlyTransform, constrain: boolean): void {
        this._helper.apply(that, constrain);
        this._mercatorTransform.apply(this, false);
        this._verticalPerspectiveTransform.apply(this, false, this._globeLatitudeErrorCorrectionRadians);
    }

    public get projectionMatrix(): mat4 { return this.currentTransform.projectionMatrix; }

    public get modelViewProjectionMatrix(): mat4 { return this.currentTransform.modelViewProjectionMatrix; }

    public get inverseProjectionMatrix(): mat4 { return this.currentTransform.inverseProjectionMatrix; }

    public get cameraPosition(): vec3 { return this.currentTransform.cameraPosition; }

    /**
     * Zoom level at which the strict-mode globe shader starts transitioning
     * to the mercator fallback math. Below this level the GPU runs full
     * sphere-projection; above {@link STRICT_SHADER_TRANSITION_END} it runs
     * pure mercator math via `u_projection_fallback_matrix`.
     *
     * The transition exists because the VP globe matrix is stored as Float32
     * on the GPU. At high zoom `globeRadiusPixels` is enormous, and the
     * float32 precision of the matrix can no longer distinguish adjacent
     * tile-boundary vertices — causing visible tile seams and, at extreme
     * zoom, a black screen.
     *
     * | zoom | globeRadiusPixels ≈ | float32 screen error |
     * |------|---------------------|----------------------|
     * |  11  |          167 K      |       ~0.02 px       |
     * |  12  |          334 K      |       ~0.04 px       |
     * |  13  |          668 K      |       ~0.08 px       |
     * |  14  |        1 336 K      |       ~0.16 px       |
     * |  15+ |        2 672 K+     |       ~0.32 px+      |
     *
     * The transition starts at zoom 11 (where float32 error is only 0.02 px
     * — far below any visible threshold) and completes at zoom 13. This
     * gives a **2-zoom-level gradual fade** which is much smoother than a
     * narrow 1-zoom-level transition. At zoom 11 the visual difference
     * between globe and mercator is already < 1 px across the entire
     * viewport, so the blend is imperceptible to users.
     *
     * The internal rendering pipeline (covering tiles, frustum, near/far Z)
     * also switches to mercator at STRICT_SHADER_TRANSITION_START to stay
     * consistent with the shader — see {@link _isHighZoomMercatorFallback}.
     */
    static readonly STRICT_SHADER_TRANSITION_START = 10.6;
    /** Zoom level at which the strict-mode shader is fully mercator. */
    static readonly STRICT_SHADER_TRANSITION_END = 12.6;

    /**
     * Compute the effective `projectionTransition` uniform for the shader.
     *
     * In legacy-hybrid mode this is simply `_globeness` (which ramps
     * 1→0 at zoom 11-12). In strict mode `_globeness` is always 1, but
     * we still need to ramp the *shader* transition down at high zoom to
     * avoid float32 precision artefacts — see table above.
     */
    private _computeShaderTransition(applyGlobeMatrix: boolean): number {
        if (!applyGlobeMatrix) return 0;

        let t = this._globeness;
        if (t > 0 && getProjectionSegregationMode() === 'strict') {
            const zoom = this.zoom;
            const {STRICT_SHADER_TRANSITION_START, STRICT_SHADER_TRANSITION_END} = GlobeTransform;
            if (zoom > STRICT_SHADER_TRANSITION_START) {
                const fade = Math.min(1, (zoom - STRICT_SHADER_TRANSITION_START)
                    / (STRICT_SHADER_TRANSITION_END - STRICT_SHADER_TRANSITION_START));
                t *= (1 - fade);
            }
        }
        return t;
    }

    getProjectionData(params: ProjectionDataParams): ProjectionData {
        const mercatorProjectionData = this._mercatorTransform.getProjectionData(params);
        const verticalPerspectiveProjectionData = this._verticalPerspectiveTransform.getProjectionData(params);

        return {
            mainMatrix: this.isGlobeRendering ? verticalPerspectiveProjectionData.mainMatrix : mercatorProjectionData.mainMatrix,
            clippingPlane: verticalPerspectiveProjectionData.clippingPlane,
            tileMercatorCoords: verticalPerspectiveProjectionData.tileMercatorCoords,
            projectionTransition: this._computeShaderTransition(params.applyGlobeMatrix),
            fallbackMatrix: mercatorProjectionData.fallbackMatrix,
        };
    }

    public isLocationOccluded(location: LngLat): boolean {
        return this.currentTransform.isLocationOccluded(location);
    }

    public transformLightDirection(dir: vec3): vec3 {
        return this.currentTransform.transformLightDirection(dir);
    }

    public getPixelScale(): number {
        return lerp(this._mercatorTransform.getPixelScale(), this._verticalPerspectiveTransform.getPixelScale(), this._globeness);
    }

    public getCircleRadiusCorrection(): number {
        return lerp(this._mercatorTransform.getCircleRadiusCorrection(), this._verticalPerspectiveTransform.getCircleRadiusCorrection(), this._globeness);
    }

    public getPitchedTextCorrection(textAnchorX: number, textAnchorY: number, tileID: UnwrappedTileID): number {
        const mercatorCorrection = this._mercatorTransform.getPitchedTextCorrection(textAnchorX, textAnchorY, tileID);
        const verticalCorrection = this._verticalPerspectiveTransform.getPitchedTextCorrection(textAnchorX, textAnchorY, tileID);
        return lerp(mercatorCorrection, verticalCorrection, this._globeness);
    }

    public projectTileCoordinates(x: number, y: number, unwrappedTileID: UnwrappedTileID, getElevation: (x: number, y: number) => number): PointProjection {
        return this.currentTransform.projectTileCoordinates(x, y, unwrappedTileID, getElevation);
    }

    private _calcMatrices(): void {
        if (!this._helper._width || !this._helper._height) {
            return;
        }

        // ── 1. Always compute VP matrices (needed for the globe shader path
        //       even when the internal pipeline has switched to mercator).
        this._verticalPerspectiveTransform.apply(this, false, this._globeLatitudeErrorCorrectionRadians);
        const vpNearZ = this._verticalPerspectiveTransform.nearZ;
        const vpFarZ = this._verticalPerspectiveTransform.farZ;

        // Copy VP Z to the globe helper first — mercator's apply() reads
        // them when forceOverrideZ = true.
        this._helper._nearZ = vpNearZ;
        this._helper._farZ = vpFarZ;

        // ── 2. Compute mercator matrices.
        //
        //    `forceOverrideZ` = true  → mercator inherits VP's near/far Z
        //                               (keeps depth buffers synchronized
        //                               during the globe↔mercator blend)
        //    `forceOverrideZ` = false → mercator computes its own near/far Z
        //
        //    In the transition zone (strict mode, zoom ≥ TRANSITION_START)
        //    we let mercator compute its own Z so we can interpolate below.
        const inFallback = this._isHighZoomMercatorFallback();
        const forceVPDepthValues = this.isGlobeRendering && !inFallback;
        this._mercatorTransform.apply(this, true, forceVPDepthValues);
        const mercNearZ = this._mercatorTransform.nearZ;
        const mercFarZ = this._mercatorTransform.farZ;

        // ── 3. Set globe-helper Z values.
        //
        //    During the strict-mode transition zone the shader is smoothly
        //    blending VP ↔ mercator.  A hard Z switch would cause:
        //      - horizon / ground-plane discontinuity
        //      - depth-buffer precision jump → terrain flickering
        //
        //    We therefore *interpolate* near/far Z using the same shader
        //    transition factor (1 = full VP, 0 = full mercator).  At the
        //    start of the zone the Z values are still VP's; at the end
        //    they are mercator's; in between they change smoothly.
        if (inFallback) {
            const t = this._computeShaderTransition(true);
            this._helper._nearZ = t > 0 ? lerp(mercNearZ, vpNearZ, t) : mercNearZ;
            this._helper._farZ  = t > 0 ? lerp(mercFarZ, vpFarZ, t) : mercFarZ;
        } else {
            // Outside transition: use the mercator Z as final (which was
            // computed with VP's Z forced, so they're in sync).
            this._helper._nearZ = mercNearZ;
            this._helper._farZ = mercFarZ;
        }
    }

    calculateFogMatrix(unwrappedTileID: UnwrappedTileID): mat4 {
        return this.currentTransform.calculateFogMatrix(unwrappedTileID);
    }

    getVisibleUnwrappedCoordinates(tileID: CanonicalTileID): UnwrappedTileID[] {
        return this.currentTransform.getVisibleUnwrappedCoordinates(tileID);
    }

    getCameraFrustum(): Frustum {
        return this.currentTransform.getCameraFrustum();
    }
    getClippingPlane(): vec4 | null {
        return this.currentTransform.getClippingPlane();
    }
    getCoveringTilesDetailsProvider(): CoveringTilesDetailsProvider {
        return this.currentTransform.getCoveringTilesDetailsProvider();
    }

    recalculateZoomAndCenter(terrain?: Terrain): void {
        // ── Fix: update the globe helper so the camera smoothly
        //    transitions to the terrain surface when elevation-freeze
        //    is released (movement end).
        //
        //    Previously only the sub-transforms' helpers were adjusted,
        //    leaving the globe helper (the "source of truth") untouched.
        //    That caused a visible jump: setElevation() in the render
        //    loop would change the globe helper's elevation without a
        //    compensating center/zoom adjustment, making the terrain
        //    appear to suddenly rise or fall.
        //
        //    By calling screenPointToLocation (which uses currentTransform
        //    — mercator at high zoom, VP at low zoom) we find where the
        //    viewport centre falls on the terrain and feed that elevation
        //    into the globe helper's own recalculateZoomAndCenter.  This
        //    adjusts center, zoom AND elevation together, keeping the
        //    camera in place while the look-at point snaps to the
        //    terrain surface.
        const centerOnTerrain = this.screenPointToLocation(this.centerPoint, terrain);
        const terrainElevation = terrain
            ? terrain.getElevationForLngLatZoom(centerOnTerrain, this._helper._tileZoom)
            : 0;
        this._helper.recalculateZoomAndCenter(terrainElevation);

        // Sub-transforms also maintain their own helpers; update them
        // for internal bookkeeping (the values are overwritten by the
        // next _calcMatrices anyway, but this keeps them consistent
        // inside a single frame if anything reads them before that).
        this._mercatorTransform.recalculateZoomAndCenter(terrain);
        this._verticalPerspectiveTransform.recalculateZoomAndCenter(terrain);
    }

    maxPitchScaleFactor(): number {
        // Using mercator version of this should be good enough approximation for globe.
        return this._mercatorTransform.maxPitchScaleFactor();
    }

    getCameraPoint(): Point {
        return this._helper.getCameraPoint();
    }

    getCameraAltitude(): number {
        return this._helper.getCameraAltitude();
    }

    getCameraLngLat(): LngLat {
        return this._helper.getCameraLngLat();
    }

    lngLatToCameraDepth(lngLat: LngLat, elevation: number): number {
        return this.currentTransform.lngLatToCameraDepth(lngLat, elevation);
    }

    populateCache(coords: OverscaledTileID[]): void {
        this._mercatorTransform.populateCache(coords);
        this._verticalPerspectiveTransform.populateCache(coords);
    }

    getBounds(): LngLatBounds {
        return this.currentTransform.getBounds();
    }

    defaultConstrain: TransformConstrainFunction = (lngLat, zoom) => {
        return this.currentTransform.defaultConstrain(lngLat, zoom);
    };

    applyConstrain: TransformConstrainFunction = (lngLat, zoom) => {
        return this._helper.applyConstrain(lngLat, zoom);
    };

    calculateCenterFromCameraLngLatAlt(lngLat: LngLatLike, alt: number, bearing?: number, pitch?: number): {center: LngLat; elevation: number; zoom: number} {
        return this._helper.calculateCenterFromCameraLngLatAlt(lngLat, alt, bearing, pitch);
    }

    /**
     * Note: automatically adjusts zoom to keep planet size consistent
     * (same size before and after a {@link setLocationAtPoint} call).
     */
    setLocationAtPoint(lnglat: LngLat, point: Point): void {
        if (!this.isGlobeRendering) {
            this._mercatorTransform.setLocationAtPoint(lnglat, point);
            this.apply(this._mercatorTransform, false);
            return;
        }
        this._verticalPerspectiveTransform.setLocationAtPoint(lnglat, point);
        this.apply(this._verticalPerspectiveTransform, false);
        return;
    }

    locationToScreenPoint(lnglat: LngLat, terrain?: Terrain): Point {
        return this.currentTransform.locationToScreenPoint(lnglat, terrain);
    }

    screenPointToMercatorCoordinate(p: Point, terrain?: Terrain): MercatorCoordinate {
        return this.currentTransform.screenPointToMercatorCoordinate(p, terrain);
    }

    screenPointToLocation(p: Point, terrain?: Terrain): LngLat {
        return this.currentTransform.screenPointToLocation(p, terrain);
    }

    isPointOnMapSurface(p: Point, terrain?: Terrain): boolean {
        return this.currentTransform.isPointOnMapSurface(p, terrain);
    }

    /**
     * Computes normalized direction of a ray from the camera to the given screen pixel.
     */
    getRayDirectionFromPixel(p: Point): vec3 {
        return this._verticalPerspectiveTransform.getRayDirectionFromPixel(p);
    }

    getMatrixForModel(location: LngLatLike, altitude?: number): mat4 {
        return this.currentTransform.getMatrixForModel(location, altitude);
    }

    getProjectionDataForCustomLayer(applyGlobeMatrix: boolean = true): ProjectionData {
        const mercatorData = this._mercatorTransform.getProjectionDataForCustomLayer(applyGlobeMatrix);

        if (!this.isGlobeRendering) {
            return mercatorData;
        }

        const globeData = this._verticalPerspectiveTransform.getProjectionDataForCustomLayer(applyGlobeMatrix);
        globeData.fallbackMatrix = mercatorData.mainMatrix;
        // Apply the same high-zoom shader transition for custom layers.
        globeData.projectionTransition = this._computeShaderTransition(applyGlobeMatrix);
        return globeData;
    }

    getFastPathSimpleProjectionMatrix(tileID: OverscaledTileID): mat4 {
        return this.currentTransform.getFastPathSimpleProjectionMatrix(tileID);
    }
}
