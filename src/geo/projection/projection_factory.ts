import {warnOnce} from '../../util/util';
import {MercatorProjection} from './mercator_projection';
import {MercatorTransform} from './mercator_transform';
import {MercatorCameraHelper} from './mercator_camera_helper';
import {GlobeProjection} from './globe_projection';
import {GlobeTransform} from './globe_transform';
import {GlobeCameraHelper} from './globe_camera_helper';
import {VerticalPerspectiveCameraHelper} from './vertical_perspective_camera_helper';
import {VerticalPerspectiveTransform} from './vertical_perspective_transform';
import {VerticalPerspectiveProjection} from './vertical_perspective_projection';
import {getProjectionSegregationMode} from './projection_config';

import type {ProjectionSpecification} from '@maplibre/maplibre-gl-style-spec';
import type {Projection} from './projection';
import type {ITransform, TransformConstrainFunction} from '../transform_interface';
import type {ICameraHelper} from './camera_helper';

export function createProjectionFromName(name: ProjectionSpecification['type'], transformConstrain?: TransformConstrainFunction): {
    projection: Projection;
    transform: ITransform;
    cameraHelper: ICameraHelper;
} {
    const transformOptions = {constrainOverride: transformConstrain};
    const mode = getProjectionSegregationMode();

    if (Array.isArray(name)) {
        // Array-based projection definition (interpolate expression)
        // In strict mode, array-based definitions are not supported for globe;
        // fall through to legacy-hybrid behavior.
        const globeProjection = new GlobeProjection({type: name});
        return {
            projection: globeProjection,
            transform: new GlobeTransform(transformOptions),
            cameraHelper: new GlobeCameraHelper(globeProjection),
        };
    }
    switch (name) {
        case 'mercator':
        {
            return {
                projection: new MercatorProjection(),
                transform: new MercatorTransform(transformOptions),
                cameraHelper: new MercatorCameraHelper(),
            };
        }
        case 'globe':
        {
            if (mode === 'strict') {
                // Strict mode: 'globe' uses Globe* wrappers but configured with
                // fixed 'vertical-perspective' (no zoom-based transition).
                // Combined with strict guards in GlobeProjection/GlobeTransform/
                // GlobeCameraHelper, this ensures:
                //  - transitionState is always 1
                //  - _globeness is always 1
                //  - useGlobeControls is always true
                //  - projection.name remains 'globe' (API compatible)
                const globeProjection = new GlobeProjection({type: 'vertical-perspective'});
                return {
                    projection: globeProjection,
                    transform: new GlobeTransform(transformOptions),
                    cameraHelper: new GlobeCameraHelper(globeProjection),
                };
            }
            // Legacy-hybrid mode: 'globe' creates a hybrid pipeline that transitions
            // between VerticalPerspective and Mercator based on zoom level.
            const globeProjection = new GlobeProjection({type: [
                'interpolate',
                ['linear'],
                ['zoom'],
                11,
                'vertical-perspective',
                12,
                'mercator'
            ]});
            return {
                projection: globeProjection,
                transform: new GlobeTransform(transformOptions),
                cameraHelper: new GlobeCameraHelper(globeProjection),
            };
        }
        case 'vertical-perspective':
        {
            return {
                projection: new VerticalPerspectiveProjection(),
                transform: new VerticalPerspectiveTransform(transformOptions),
                cameraHelper: new VerticalPerspectiveCameraHelper(),
            };
        }
        default:
        {
            warnOnce(`Unknown projection name: ${name}. Falling back to mercator projection.`);
            return {
                projection: new MercatorProjection(),
                transform: new MercatorTransform(transformOptions),
                cameraHelper: new MercatorCameraHelper(),
            };
        }
    }
}
