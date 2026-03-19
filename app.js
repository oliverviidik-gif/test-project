void (async () => {
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

  const statusEl = document.getElementById('statusText');
  const cityInput = document.getElementById('cityInput');
  const flyButton = document.getElementById('flyButton');
  const homeButton = document.getElementById('homeButton');
  const presetButtons = document.getElementById('presetButtons');

  const imageryState = {
    worldImagery: 'loading',
    osm: 'ready',
    search: 'idle',
  };

  const renderStatus = () => {
    const issues = [];
    if (imageryState.worldImagery === 'blocked') issues.push('Cesium World Imagery unavailable');
    if (imageryState.osm === 'blocked') issues.push('street labels unavailable');
    if (imageryState.search === 'blocked') issues.push('city search unavailable');

    if (imageryState.worldImagery === 'loading') {
      statusEl.textContent = 'Loading Cesium World Imagery satellite tiles…';
      return;
    }

    statusEl.textContent = issues.length
      ? `Live map issue detected: ${issues.join(', ')}.`
      : 'Cesium World Imagery is active for full-globe satellite detail, with street labels fading in near the ground.';
  };

  renderStatus();

  const ionToken = window.CESIUM_ION_TOKEN || Cesium.Ion.defaultAccessToken;
  if (ionToken) {
    Cesium.Ion.defaultAccessToken = ionToken;
  }

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
    requestRenderMode: true,
    maximumRenderTimeChange: Number.POSITIVE_INFINITY,
  });

  const maxResolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
  viewer.resolutionScale = maxResolutionScale;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.fog.enabled = true;
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#09121d');
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 25;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 48_000_000;

  const defaultDestination = Cesium.Cartesian3.fromDegrees(11, 22, 24_000_000);
  viewer.camera.setView({
    destination: defaultDestination,
    orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
  });

  const imageryLayers = viewer.imageryLayers;

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

  let worldImageryLayer = null;
  try {
    const worldImageryProvider = await Cesium.createWorldImageryAsync({
      style: Cesium.IonWorldImageryStyle.AERIAL,
    });
    worldImageryLayer = attachProviderLayer({
      name: 'worldImagery',
      provider: worldImageryProvider,
      alphaByHeight: () => 1,
    });
    imageryState.worldImagery = 'ready';
  } catch (error) {
    console.error('Unable to load Cesium World Imagery.', error);
    imageryState.worldImagery = 'blocked';
  }

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
    if (worldImageryLayer) {
      worldImageryLayer.alpha = imageryState.worldImagery === 'blocked' ? 0 : 1;
    }
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
