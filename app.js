(() => {
  const cityPresets = [
    { label: 'Tallinn', lon: 24.7536, lat: 59.437, height: 1800 },
    { label: 'Tokyo', lon: 139.6917, lat: 35.6895, height: 1800 },
    { label: 'New York', lon: -74.006, lat: 40.7128, height: 1800 },
    { label: 'Cape Town', lon: 18.4241, lat: -33.9249, height: 1800 },
  ];

  const smoothstep = (edge0, edge1, value) => {
    const t = Cesium.Math.clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const createFallbackEarthTexture = () => {
    const canvas = document.createElement('canvas');
    const width = 2048;
    const height = 1024;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const ocean = ctx.createLinearGradient(0, 0, 0, height);
    ocean.addColorStop(0, '#0f3d77');
    ocean.addColorStop(0.45, '#144f91');
    ocean.addColorStop(0.7, '#0d3c72');
    ocean.addColorStop(1, '#0b2e55');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, width, height);

    const polarGlow = ctx.createRadialGradient(width * 0.5, height * 0.06, 0, width * 0.5, height * 0.06, width * 0.35);
    polarGlow.addColorStop(0, 'rgba(255,255,255,0.35)');
    polarGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = polarGlow;
    ctx.fillRect(0, 0, width, height);

    const continents = [
      {
        points: [
          [0.08, 0.18], [0.18, 0.09], [0.27, 0.11], [0.31, 0.17], [0.29, 0.24],
          [0.23, 0.29], [0.21, 0.34], [0.18, 0.41], [0.13, 0.4], [0.1, 0.31], [0.07, 0.24],
        ],
      },
      {
        points: [
          [0.28, 0.34], [0.32, 0.39], [0.33, 0.47], [0.31, 0.61], [0.28, 0.75],
          [0.23, 0.86], [0.2, 0.78], [0.21, 0.64], [0.23, 0.54], [0.25, 0.44],
        ],
      },
      {
        points: [
          [0.44, 0.16], [0.52, 0.12], [0.65, 0.15], [0.75, 0.17], [0.86, 0.23],
          [0.9, 0.3], [0.86, 0.4], [0.78, 0.44], [0.73, 0.39], [0.68, 0.39], [0.61, 0.33],
          [0.56, 0.31], [0.52, 0.24], [0.45, 0.23],
        ],
      },
      {
        points: [
          [0.53, 0.39], [0.59, 0.43], [0.62, 0.5], [0.61, 0.63], [0.58, 0.75],
          [0.52, 0.8], [0.49, 0.72], [0.48, 0.62], [0.49, 0.5],
        ],
      },
      {
        points: [
          [0.78, 0.57], [0.85, 0.61], [0.89, 0.68], [0.87, 0.78], [0.81, 0.82],
          [0.75, 0.75], [0.74, 0.64],
        ],
      },
      {
        points: [[0.84, 0.13], [0.88, 0.11], [0.91, 0.14], [0.89, 0.19], [0.85, 0.18]],
      },
      {
        points: [[0.38, 0.86], [0.5, 0.84], [0.6, 0.86], [0.73, 0.9], [0.63, 0.97], [0.41, 0.97]],
      },
    ];

    const drawLandmass = (points) => {
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        const px = x * width;
        const py = y * height;
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    continents.forEach((continent, index) => {
      const landGradient = ctx.createLinearGradient(0, continent.points[0][1] * height, 0, height);
      landGradient.addColorStop(0, index % 2 === 0 ? '#6c9f54' : '#7daf61');
      landGradient.addColorStop(0.55, '#487947');
      landGradient.addColorStop(1, '#795735');
      ctx.fillStyle = landGradient;
      ctx.strokeStyle = 'rgba(17, 43, 23, 0.55)';
      ctx.lineWidth = 5;
      drawLandmass(continent.points);
    });

    for (let i = 0; i < 850; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 5 + Math.random() * 28;
      const alpha = 0.025 + Math.random() * 0.045;
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const cloudBands = ctx.createLinearGradient(0, 0, width, height);
    cloudBands.addColorStop(0, 'rgba(255,255,255,0.06)');
    cloudBands.addColorStop(0.4, 'rgba(255,255,255,0.015)');
    cloudBands.addColorStop(0.7, 'rgba(255,255,255,0.08)');
    cloudBands.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = cloudBands;
    ctx.fillRect(0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.86);
  };

  const fallbackProvider = new Cesium.SingleTileImageryProvider({
    url: createFallbackEarthTexture(),
    rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
    credit: 'Local fallback Earth texture generated in-browser',
  });

  const viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    baseLayer: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: true,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    scene3DOnly: true,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    imageryProvider: fallbackProvider,
    requestRenderMode: true,
    maximumRenderTimeChange: Number.POSITIVE_INFINITY,
  });

  const maxResolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
  viewer.resolutionScale = maxResolutionScale;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.fog.enabled = true;
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a2342');
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 25;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 48_000_000;

  const defaultDestination = Cesium.Cartesian3.fromDegrees(11, 22, 24_000_000);
  viewer.camera.setView({
    destination: defaultDestination,
    orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
  });

  const imageryLayers = viewer.imageryLayers;
  const imageryState = {
    arcgis: 'ready',
    osm: 'ready',
    search: 'idle',
  };

  const statusEl = document.getElementById('statusText');
  const cityInput = document.getElementById('cityInput');
  const flyButton = document.getElementById('flyButton');
  const homeButton = document.getElementById('homeButton');
  const presetButtons = document.getElementById('presetButtons');

  const renderStatus = () => {
    const issues = [];
    if (imageryState.arcgis === 'blocked') issues.push('satellite layer unavailable');
    if (imageryState.osm === 'blocked') issues.push('street labels unavailable');
    if (imageryState.search === 'blocked') issues.push('city search unavailable');

    statusEl.textContent = issues.length
      ? `Fallback mode active: ${issues.join(', ')}.`
      : 'Streaming satellite imagery with local offline-safe globe fallback.';
  };

  const attachProviderLayer = ({ name, provider, alphaByHeight, show = true }) => {
    const layer = imageryLayers.addImageryProvider(provider);
    layer.show = show;
    layer.alpha = alphaByHeight(viewer.camera.positionCartographic.height);

    provider.errorEvent.addEventListener(() => {
      imageryState[name] = 'blocked';
      layer.show = false;
      renderStatus();
    });

    return layer;
  };

  const arcgisLayer = attachProviderLayer({
    name: 'arcgis',
    provider: new Cesium.UrlTemplateImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: 'Esri, Maxar, Earthstar Geographics',
      maximumLevel: 19,
    }),
    alphaByHeight: (height) => smoothstep(55_000_000, 8_000_000, height),
  });

  const osmLayer = attachProviderLayer({
    name: 'osm',
    provider: new Cesium.OpenStreetMapImageryProvider({
      url: 'https://tile.openstreetmap.org/',
      maximumLevel: 19,
      credit: '© OpenStreetMap contributors',
    }),
    alphaByHeight: (height) => smoothstep(1_300_000, 120_000, height),
  });

  renderStatus();

  viewer.scene.preRender.addEventListener(() => {
    const height = viewer.camera.positionCartographic.height;
    arcgisLayer.alpha = imageryState.arcgis === 'blocked' ? 0 : smoothstep(55_000_000, 8_000_000, height);
    osmLayer.alpha = imageryState.osm === 'blocked' ? 0 : smoothstep(1_300_000, 120_000, height);
  });

  const flyToLocation = ({ lon, lat, height = 80_000, heading = 0, pitch = -0.92 }) => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch,
        roll: 0,
      },
      duration: 2.8,
    });
  };

  const setSearchState = (state) => {
    imageryState.search = state;
    renderStatus();
  };

  const flyToCity = async () => {
    const query = cityInput.value.trim();
    if (!query) return;

    flyButton.disabled = true;
    flyButton.textContent = 'Loading…';

    try {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const [match] = await response.json();
      if (!match) throw new Error('No results');

      setSearchState('ready');
      flyToLocation({
        lon: Number(match.lon),
        lat: Number(match.lat),
        height: 2400,
        pitch: -0.75,
      });
    } catch (error) {
      console.warn('Unable to geocode city', error);
      setSearchState('blocked');
    } finally {
      flyButton.disabled = false;
      flyButton.textContent = 'Fly';
    }
  };

  flyButton.addEventListener('click', flyToCity);
  cityInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') flyToCity();
  });

  homeButton.addEventListener('click', () => {
    viewer.camera.flyTo({
      destination: defaultDestination,
      orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
      duration: 2.7,
    });
  });

  cityPresets.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-button';
    button.textContent = preset.label;
    button.addEventListener('click', () => flyToLocation(preset));
    presetButtons.appendChild(button);
  });

  const maybeAddBuildings = async () => {
    try {
      const buildings = await Cesium.createOsmBuildingsAsync();
      viewer.scene.primitives.add(buildings);
    } catch (error) {
      console.info('OSM 3D buildings layer unavailable in this browser session.');
    }
  };

  maybeAddBuildings();
})();
