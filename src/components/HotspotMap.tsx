"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl/dist/maplibre-gl-csp";
import "maplibre-gl/dist/maplibre-gl.css";

import Papa from "papaparse";

const SATELLITES: Record<string, string> = {
  N: "Suomi NPP",
  N20: "NOAA-20",
  N21: "NOAA-21",
};
const CONFIDENCE: Record<string, string> = {
  l: "Low",
  n: "Nominal",
  h: "High",
};

// acq_time arrives as "521" for 05:21, so pad to 4 digits first
function parseAcquired(date: string, time: string): Date {
  const t = time.padStart(4, "0");
  return new Date(`${date}T${t.slice(0, 2)}:${t.slice(2)}:00Z`);
}

function fmt(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function hoursAgo(d: Date): string {
  const h = Math.round((Date.now() - d.getTime()) / 36e5);
  return h < 1 ? "less than 1 h ago" : `${h} h ago`;
}

type Row = {
  latitude: string;
  longitude: string;
  confidence: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  frp: string;
  bright_ti4: string;
};

maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");
export default function HotspotMap() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "bg",
            type: "background",
            paint: { "background-color": "#0f172a" },
          },
        ],
      },
      center: [114, 0],
      zoom: 5,
    });

    map.on("load", async () => {
      map.addSource("borders", {
        type: "geojson",
        data: "/data/indonesia.geojson",
      });
      map.addLayer({
        id: "borders-fill",
        type: "fill",
        source: "borders",
        paint: { "fill-color": "#1e293b" },
      });
      map.addLayer({
        id: "borders-line",
        type: "line",
        source: "borders",
        paint: { "line-color": "#475569", "line-width": 0.5 },
      });

      const res = await fetch("/data/hotspots.csv");
      if (!res.ok) {
        console.warn("hotspots.csv not found");
        return;
      }
      const text = await res.text();
      const { data } = Papa.parse<Row>(text, {
        header: true,
        skipEmptyLines: true,
      });

      map.addSource("hotspots", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: data.map((r) => ({
            type: "Feature",
            properties: {
              confidence: r.confidence,
              acq_date: r.acq_date,
              acq_time: r.acq_time,
              satellite: r.satellite,
              frp: Number(r.frp),
              bright_ti4: Number(r.bright_ti4),
            },
            geometry: {
              type: "Point",
              coordinates: [Number(r.longitude), Number(r.latitude)],
            },
          })),
        },
      });

      map.addLayer({
        id: "hotspots-circles",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4,
            2,
            8,
            5,
            12,
            8,
          ],
          "circle-color": [
            "match",
            ["get", "confidence"],
            "h",
            "#ef4444",
            "n",
            "#f97316",
            "#facc15",
          ],
          "circle-opacity": 0.5,
        },
      });
      map.on("click", "hotspots-circles", (e) => {
        const f = e.features?.[0];
        if (!f) return;

        const p = f.properties as {
          confidence: string;
          acq_date: string;
          acq_time: string;
          satellite: string;
          frp: number;
          bright_ti4: number;
        };
        const coords = (
          f.geometry as unknown as { coordinates: [number, number] }
        ).coordinates;
        const when = parseAcquired(p.acq_date, p.acq_time);

        const html = `
            <div style="font: 13px/1.5 system-ui, sans-serif; color: #0f172a;">
            <strong>Thermal detection</strong><br/>
            ${fmt(when, "UTC")} UTC<br/>
            ${fmt(when, "Asia/Makassar")} WITA · ${fmt(when, "Asia/Jakarta")} WIB<br/>
            <em>${hoursAgo(when)}</em>
            <hr style="margin: 6px 0; border: 0; border-top: 1px solid #cbd5e1;"/>
            Confidence: ${CONFIDENCE[p.confidence] ?? p.confidence}<br/>
            FRP: ${p.frp} MW<br/>
            Brightness (TI4): ${p.bright_ti4} K<br/>
            Satellite: ${SATELLITES[p.satellite] ?? p.satellite}<br/>
            Location: ${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}
            </div>`;

        new maplibregl.Popup({ maxWidth: "260px" })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      map.on(
        "mouseenter",
        "hotspots-circles",
        () => (map.getCanvas().style.cursor = "pointer"),
      );
      map.on(
        "mouseleave",
        "hotspots-circles",
        () => (map.getCanvas().style.cursor = ""),
      );
    });

    return () => map.remove();
  }, []);

  return <div ref={container} className="h-screen w-full" />;
}
