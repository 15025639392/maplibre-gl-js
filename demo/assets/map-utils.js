(function(global) {
    const gaodeSubdomains = ['01', '02', '03', '04'];
    const gaodeTiles = gaodeSubdomains.map(function(subdomain) {
        return `https://webst${subdomain}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}`;
    });

    function createDefaultStyle() {
        return {
            'projection': {
                'type': 'globe'
            },
            // 'sky': {
            //     'atmosphere-blend': [
            //         'interpolate',
            //         ['linear'],
            //         ['zoom'],
            //         0, 1,
            //         5, 1,
            //         7, 0
            //     ]
            // },
            // 'light': {
            //     'anchor': 'map',
            //     'position': [1.5, 90, 80]
            // },
            version: 8,
            sources: {
                gaode: {
                    type: 'raster',
                    tiles: gaodeTiles,
                    tileSize: 256,
                    minzoom: 0,
                    maxzoom: 17,
                    attribution: '(C) AutoNavi'
                },
                terrain: {
                    type: 'raster-dem',
                    tileSize: 512,
                    maxzoom: 17,
                    minzoom: 6,
                    tiles: ['https://mapoverlay.xinzhi.space/3dterrain/nasa/tiles/{z}/{x}/{y}.png']
                }
            },
            layers: [
                {
                    id: 'base-background',
                    type: 'background',
                    paint: {
                        'background-color': '#a7c8ed'
                    }
                },
                {
                    id: 'gaode-base',
                    type: 'raster',
                    source: 'gaode',
                    paint: {
                        'raster-fade-duration': 450,
                        'raster-resampling': 'linear'
                    }
                }
            ],
            // terrain: {
            //     source: 'terrain',
            //     exaggeration: 1
            // }
        };
    }

    const defaultOptions = {
        center: [116.391, 39.907],
        zoom: 9,
        pitch: 45,
        maxPitch: 80,
        // Keep previous/low-zoom tiles visible while high-zoom tiles are still downloading.
        cancelPendingTileRequestsWhileZooming: false,
        // Keep enough parent/neighbor tiles in cache to avoid blank gaps during fast interactions.
        maxTileCacheZoomLevels: 16,
        // Smooth cross-fade for raster tile replacement.
        fadeDuration: 450,
        renderWorldCopies: true,
        refreshExpiredTiles: true,
    };

    function createMap(options) {
        const mapOptions = {
            style: createDefaultStyle(),
            ...defaultOptions,
            ...options
        };
        return new maplibregl.Map(mapOptions);
    }

    function addDefaultControls(map, options) {
        const position = (options && options.position) || 'top-right';
        map.addControl(new maplibregl.NavigationControl(), position);
        map.addControl(new maplibregl.ScaleControl({maxWidth: 100, unit: 'metric'}), 'bottom-left');
        return map;
    }

    function addStatusLabel(element, text) {
        if (element) {
            element.textContent = text;
        }
    }

    global.demoUtils = {
        createMap: createMap,
        addDefaultControls: addDefaultControls,
        addStatusLabel: addStatusLabel
    };
})(window);
