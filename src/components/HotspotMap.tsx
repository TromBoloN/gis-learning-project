"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl/dist/maplibre-gl-csp";
import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";

import Papa from "papaparse";



type Row = { latitude: string; longitude: string; confidence: string; acq_date: string; acq_time: string; frp: string };

maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");
export default function HotspotMap() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    const map = new maplibregl.Map({
      container: container.current,
      style: { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#0f172a" } }] },
      center: [114, 0],
      zoom: 5,
    });

    map.on("load", async () => {
      map.addSource("borders", { type: "geojson", data: "/data/indonesia.geojson" });
      map.addLayer({ id: "borders-fill", type: "fill", source: "borders", paint: { "fill-color": "#1e293b" } });
      map.addLayer({ id: "borders-line", type: "line", source: "borders", paint: { "line-color": "#475569", "line-width": 0.5 } });

      const text = await (await fetch("/data/hotspots.csv")).text();
      const { data } = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });

      map.addSource("hotspots", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: data.map((r) => ({
            type: "Feature",
            properties: { confidence: r.confidence, acq: `${r.acq_date} ${r.acq_time} UTC`, frp: Number(r.frp) },
            geometry: { type: "Point", coordinates: [Number(r.longitude), Number(r.latitude)] },
          })),
        },
      });

      map.addLayer({
        id: "hotspots-circles",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": 4,
          "circle-color": ["match", ["get", "confidence"], "h", "#ef4444", "n", "#f97316", "#facc15"],
          "circle-opacity": 0.8,
        },
      });
    });

    return () => map.remove();
  }, []);

  return <div ref={container} className="h-screen w-full" />;
}