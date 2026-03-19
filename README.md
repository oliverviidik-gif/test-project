# Earth Digital Twin

Interactive 3D Earth viewer built with CesiumJS. It supports smooth camera zoom from space to street-scale imagery, city search, preset fly-to shortcuts, and optional OSM 3D buildings when available.

## What changed

- Added an in-browser fallback Earth texture so the globe still renders with visible continents even if a remote imagery provider blocks or rate-limits requests.
- Layered public ArcGIS World Imagery and OpenStreetMap tiles on top for realistic satellite views plus street-level labels.
- Added quick city presets and a clearer status banner so users can tell when the app is using fallback mode.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
