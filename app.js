(() => {
  const maxResolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);

  const dayImagery = new Cesium.UrlTemplateImageryProvider({
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    credit: "Esri, Maxar, Earthstar Geographics",
    maximumLevel: 19,
  });

  const viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: true,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: true,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    imageryProvider: dayImagery,
    requestRenderMode: true,
    maximumRenderTimeChange: Number.POSITIVE_INFINITY,
  });

  viewer.resolutionScale = maxResolutionScale;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.fog.enabled = false;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 15;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 48_000_000;

  const imageryLayers = viewer.imageryLayers;
  const dayLayer = imageryLayers.get(0);

  const nightLightsLayer = imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
      credit: "NASA GIBS / VIIRS Black Marble",
      maximumLevel: 8,
    })
  );
  nightLightsLayer.alpha = 0;

  const osmOverlay = imageryLayers.addImageryProvider(
    new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" })
  );
  osmOverlay.alpha = 0;

  const cloudRadius = Cesium.Ellipsoid.WGS84.maximumRadius + 11_500;
  let cloudRotation = 0;
  const cloudsPrimitive = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.SphereGeometry({
          radius: cloudRadius,
          vertexFormat: Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
        }),
      }),
      appearance: new Cesium.MaterialAppearance({
        faceForward: true,
        translucent: true,
        closed: true,
        material: new Cesium.Material({
          fabric: {
            type: "Image",
            uniforms: {
              image: "https://unpkg.com/three-globe/example/img/earth-clouds.png",
              color: new Cesium.Color(1, 1, 1, 0.65),
            },
          },
        }),
      }),
      asynchronous: true,
    })
  );

  const smoothstep = (edge0, edge1, x) => {
    const t = Cesium.Math.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const defaultDestination = Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 22_000_000);
  viewer.camera.setView({
    destination: defaultDestination,
    orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
  });

  const cityInput = document.getElementById("cityInput");
  const flyButton = document.getElementById("flyButton");
  const homeButton = document.getElementById("homeButton");
  const orbitalEffectsToggle = document.getElementById("orbitalEffectsToggle");
  const nightModeToggle = document.getElementById("nightModeToggle");

  const orbitalThreshold = 450_000;
  const noonJulian = Cesium.JulianDate.fromIso8601("2024-06-21T12:00:00Z");
  const midnightJulian = Cesium.JulianDate.fromIso8601("2024-06-21T00:00:00Z");

  const setSceneState = () => {
    const cameraHeight = viewer.camera.positionCartographic.height;
    const inOrbitalView = cameraHeight > orbitalThreshold;
    const effectsEnabled = orbitalEffectsToggle.checked && inOrbitalView;
    const nightModeEnabled = nightModeToggle.checked && inOrbitalView;

    viewer.scene.skyAtmosphere.show = effectsEnabled;
    viewer.scene.globe.showGroundAtmosphere = effectsEnabled;
    cloudsPrimitive.show = effectsEnabled;

    viewer.clock.currentTime = nightModeEnabled ? midnightJulian : noonJulian;

    dayLayer.brightness = nightModeEnabled ? 0.18 : 1.0;
    nightLightsLayer.alpha = nightModeEnabled ? 0.95 : 0;

    // Fade in OSM as the camera nears the ground to increase street-level detail.
    osmOverlay.alpha = smoothstep(2_500_000, 250_000, cameraHeight);
  };

  const flyToCity = async () => {
    const query = cityInput.value.trim();
    if (!query) return;

    try {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
      });
      const [match] = await response.json();
      if (!match) return;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(Number(match.lon), Number(match.lat), 80_000),
        duration: 2.6,
      });
    } catch (error) {
      console.warn("Unable to geocode city", error);
    }
  };

  flyButton.addEventListener("click", flyToCity);
  cityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") flyToCity();
  });

  homeButton.addEventListener("click", () => {
    viewer.camera.flyTo({
      destination: defaultDestination,
      duration: 2.5,
    });
  });

  orbitalEffectsToggle.addEventListener("change", () => {
    setSceneState();
    viewer.scene.requestRender();
  });

  nightModeToggle.addEventListener("change", () => {
    setSceneState();
    viewer.scene.requestRender();
  });

  viewer.scene.preRender.addEventListener(() => {
    setSceneState();
  });

  viewer.clock.onTick.addEventListener((clock) => {
    cloudRotation += clock.deltaSeconds * 0.003;
    const rotation = Cesium.Matrix3.fromRotationZ(cloudRotation, new Cesium.Matrix3());
    cloudsPrimitive.modelMatrix = Cesium.Matrix4.fromRotationTranslation(rotation);
    if (cloudsPrimitive.show) viewer.scene.requestRender();
  });

  const maybeAddBuildings = async () => {
    try {
      const buildings = await Cesium.createOsmBuildingsAsync();
      viewer.scene.primitives.add(buildings);
    } catch (_error) {
      console.info("OSM 3D buildings layer unavailable in this browser session.");
    }
  };

  maybeAddBuildings();
  setSceneState();
})();
