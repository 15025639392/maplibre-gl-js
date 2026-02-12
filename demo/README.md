# Demo Directory

This folder is a dedicated local demo workspace, separate from `test/examples`.

## Run

```bash
npm run start-demo
```

Open:

- http://localhost:9977/demo/

## Structure

```text
demo/
  assets/                  # Shared CSS and JS helpers
  index.html               # Demo hub
  basic-map.html           # Quick smoke test
  layers/                  # Layer/source demos
  controls/                # Control interaction demos
  performance/             # Performance and stability demos
```

## Add a New Demo Page

1. Pick a category directory (`layers`, `controls`, or `performance`).
2. Copy one existing page in that category as a template.
3. Keep using local bundles:
   - `../../dist/maplibre-gl-dev.js`
   - `../../dist/maplibre-gl.css`
4. Add a link to the category `index.html` and to `demo/index.html`.

## Notes

- `start-demo` runs `watch-dev` and `watch-css`, so bundles stay fresh while editing source code.
- `demo/assets/map-utils.js` contains shared map setup helpers.
