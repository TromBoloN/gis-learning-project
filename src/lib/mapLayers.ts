import type { MapInstance } from "./maplibre";

export function addBaseLayers(map: MapInstance) {
  map.addSource("borders", { type: "geojson", data: "/data/indonesia.geojson" });

  // yesterday UTC; today's mosaic is often incomplete
  const day = new Date(Date.now() - 24 * 36e5).toISOString().slice(0, 10);
  map.addSource("gibs", {
    type: "raster",
    tileSize: 256,
    maxzoom: 9,
    tiles: [
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    ],
    attribution: "Imagery: NASA GIBS",
  });

  // z-order = order added
  map.addLayer({
    id: "borders-fill",
    type: "fill",
    source: "borders",
    paint: { "fill-color": "#0f1a2e" },
  });
  map.addLayer({
    id: "gibs",
    type: "raster",
    source: "gibs",
    layout: { visibility: "none" },
    paint: { "raster-brightness-max": 0.8, "raster-saturation": -0.2 },
  });
  map.addLayer({
    id: "borders-glow",
    type: "line",
    source: "borders",
    paint: { "line-color": "#22d3ee", "line-opacity": 0.12, "line-width": 4, "line-blur": 3 },
  });
  map.addLayer({
    id: "borders-line",
    type: "line",
    source: "borders",
    paint: {
      "line-color": "#22d3ee",
      "line-opacity": 0.45,
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.6, 8, 1.2],
    },
  });
}

const byFrp = (lo: number, hi: number) => [
  "interpolate", ["linear"], ["coalesce", ["get", "frp"], 0], 0, lo, 40, hi,
];
const radius = (s: number) => [
  "interpolate", ["linear"], ["zoom"],
  4, byFrp(1.5 * s, 4 * s),
  8, byFrp(3 * s, 9 * s),
  12, byFrp(5 * s, 16 * s),
];
const color = [
  "interpolate", ["linear"], ["coalesce", ["get", "frp"], 0],
  0, "#fde047", 5, "#fb923c", 15, "#ef4444", 40, "#fecdd3",
];

export function addHotspotLayers(map: MapInstance) {
  map.addSource("hotspots", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer({
    id: "hotspots-glow",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": radius(2.2) as any,
      "circle-color": color as any,
      "circle-blur": 1,
      "circle-opacity": 0.18,
    },
  });
  map.addLayer({
    id: "hotspots-circles",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": radius(1) as any,
      "circle-color": color as any,
      "circle-opacity": 0.85,
      "circle-stroke-width": 0.5,
      "circle-stroke-color": "rgba(255,255,255,0.35)",
    },
  });
}