(() => {
  const maxResolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);

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
    imageryProvider: new Cesium.UrlTemplateImageryProvider({
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      credit: "Esri, Maxar, Earthstar Geographics",
      maximumLevel: 19,
    }),
    requestRenderMode: true,
    maximumRenderTimeChange: Number.POSITIVE_INFINITY,
  });

  viewer.resolutionScale = maxResolutionScale;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.fog.enabled = true;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 15;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 48_000_000;

  const imageryLayers = viewer.imageryLayers;
  const osmOverlay = imageryLayers.addImageryProvider(
    new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" })
  );
  osmOverlay.alpha = 0;

  const smoothstep = (edge0, edge1, x) => {
    const t = Cesium.Math.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  viewer.scene.preRender.addEventListener(() => {
    const height = viewer.camera.positionCartographic.height;
    // Fade in OSM as the camera nears the ground to increase street-level detail.
    osmOverlay.alpha = smoothstep(2_500_000, 250_000, height);
  });

  const defaultDestination = Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 22_000_000);
  viewer.camera.setView({
    destination: defaultDestination,
    orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
  });

  const cityInput = document.getElementById("cityInput");
  const flyButton = document.getElementById("flyButton");
  const homeButton = document.getElementById("homeButton");

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

  const maybeAddBuildings = async () => {
    try {
      const buildings = await Cesium.createOsmBuildingsAsync();
      viewer.scene.primitives.add(buildings);
    } catch (error) {
      console.info("OSM 3D buildings layer unavailable in this browser session.");
    }
  };

  maybeAddBuildings();
})();
