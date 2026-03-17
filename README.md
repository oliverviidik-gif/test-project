# Earth Digital Twin

Interactive 3D Earth viewer built with CesiumJS. It supports smooth camera zoom from space to street-scale imagery, city search, optional OSM 3D buildings, realistic orbital cloud/atmosphere effects, and an orbital day/night toggle that reveals NASA Black Marble city lights.

## Run locally

```bash
cd /workspace/test-project
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/`
- or explicitly `http://localhost:4173/index.html`

If your host shows a file list by default, open `index.html` (or `index.htm`, which now redirects automatically).
