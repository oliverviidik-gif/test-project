# Earth Digital Twin

Interactive 3D Earth viewer built with CesiumJS. It supports smooth camera zoom from space to street-scale satellite imagery, city search, preset fly-to shortcuts, and optional OSM 3D buildings when available.

## What changed

- Switched the globe to Cesium World Imagery so the base layer stays on real satellite tiles from orbit down toward street level.
- Kept OpenStreetMap as a near-ground overlay for labels and familiar street context.
- Added clearer runtime status messaging for Cesium World Imagery, street labels, and search availability.

## Run locally

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).
