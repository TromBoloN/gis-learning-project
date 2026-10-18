import maplibregl from "maplibre-gl/dist/maplibre-gl-csp";
import "maplibre-gl/dist/maplibre-gl.css";

maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");

export type MapInstance = InstanceType<typeof maplibregl.Map>;
export default maplibregl;