"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl/dist/maplibre-gl-csp";
import "maplibre-gl/dist/maplibre-gl.css";
import { useState } from "react";

type Item = {
  code: string;
  name: string;
  province: string;
  areaKm2: number;
  hotspots: number;
  totalFrp: number;
  per1000km2: number;
  bounds: [[number, number], [number, number]];
};
type SortKey = "hotspots" | "totalFrp" | "per1000km2";

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

maplibregl.setWorkerUrl("/maplibre-gl-csp-worker.js");
export default function HotspotMap() {
  const container = useRef<HTMLDivElement>(null);

  const mapRef = useRef<maplibregl.Map | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("hotspots");
  const [latest, setLatest] = useState<Date | null>(null);
  const [satellite, setSatellite] = useState(false);

  useEffect(() => {
    fetch("/api/ranking")
      .then((r) => r.json())
      .then((d) => setItems(d.items))
      .catch((e) => console.warn("ranking failed", e));
  }, []);

  const top = [...items].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 10);

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
    mapRef.current = map;

    map.on("load", async () => {
      map.addSource("borders", {
        type: "geojson",
        data: "/data/indonesia.geojson",
      });
      map.addLayer({
        id: "borders-fill",
        type: "fill",
        source: "borders",
        paint: { "fill-color": "#0f1a2e" },
      });

      const day = new Date(Date.now() - 24 * 36e5).toISOString().slice(0, 10);
      map.setPaintProperty("borders-fill", "fill-opacity", satellite ? 0 : 1); // yesterday UTC, today's mosaic may be incomplete
      map.addSource("gibs", {
        type: "raster",
        tileSize: 256,
        maxzoom: 9,
        tiles: [
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        ],
        attribution: "Imagery: NASA GIBS",
      });
      map.addLayer({
        id: "borders-glow",
        type: "line",
        source: "borders",
        paint: {
          "line-color": "#22d3ee",
          "line-opacity": 0.12,
          "line-width": 4,
          "line-blur": 3,
        },
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
      map.addLayer({
        id: "gibs",
        type: "raster",
        source: "gibs",
        layout: { visibility: "none" },
        paint: { "raster-brightness-max": 0.8, "raster-saturation": -0.2 },
      });

      const res = await fetch("/api/hotspots");
      if (!res.ok) {
        console.warn("hotspots API failed", res.status);
        return;
      }
      const geojson = await res.json();
      const times = geojson.features.map((f: any) =>
        new Date(f.properties.acquired_at).getTime(),
      );
      if (times.length) setLatest(new Date(Math.max(...times)));

      map.addSource("hotspots", { type: "geojson", data: geojson });

      // radius grows with zoom AND with FRP (zoom must be the outermost expression)
      const byFrp = (lo: number, hi: number) => [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "frp"], 0],
        0,
        lo,
        40,
        hi,
      ];
      const radius = (scale: number) => [
        "interpolate",
        ["linear"],
        ["zoom"],
        4,
        byFrp(1.5 * scale, 4 * scale),
        8,
        byFrp(3 * scale, 9 * scale),
        12,
        byFrp(5 * scale, 16 * scale),
      ];
      // yellow -> orange -> red -> near-white for the most intense detections
      const color = [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "frp"], 0],
        0,
        "#fde047",
        5,
        "#fb923c",
        15,
        "#ef4444",
        40,
        "#fecdd3",
      ];

      // soft glow underneath
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
      // crisp core on top (click target)
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
      map.on("click", "hotspots-circles", (e) => {
        const f = e.features?.[0];
        if (!f) return;

        const p = f.properties as {
          acquired_at: string;
          satellite: string;
          confidence: string;
          frp: number;
          bright_ti4: number;
          kabupaten: string;
          province: string;
        };
        const when = new Date(p.acquired_at);
        const coords = (
          f.geometry as unknown as { coordinates: [number, number] }
        ).coordinates;

        const html = `
  <div class="w-56 text-[13px] leading-relaxed">
    <div class="text-[10px] font-semibold uppercase tracking-widest text-orange-400">Thermal detection</div>
    <div class="mt-1 text-base font-semibold text-white">${p.kabupaten}</div>
    <div class="text-slate-400">${p.province}</div>
    <div class="my-3 h-px bg-slate-700/70"></div>
    <div class="grid grid-cols-2 gap-x-3 gap-y-2">
      <div><div class="text-[10px] uppercase tracking-wider text-slate-500">FRP</div><div class="font-medium">${p.frp} MW</div></div>
      <div><div class="text-[10px] uppercase tracking-wider text-slate-500">Brightness</div><div class="font-medium">${p.bright_ti4} K</div></div>
      <div><div class="text-[10px] uppercase tracking-wider text-slate-500">Confidence</div><div class="font-medium">${CONFIDENCE[p.confidence] ?? p.confidence}</div></div>
      <div><div class="text-[10px] uppercase tracking-wider text-slate-500">Satellite</div><div class="font-medium">${SATELLITES[p.satellite] ?? p.satellite}</div></div>
    </div>
    <div class="my-3 h-px bg-slate-700/70"></div>
    <div class="text-slate-300">${fmt(when, "UTC")} UTC · <span class="text-slate-500">${hoursAgo(when)}</span></div>
    <div class="text-slate-400">${fmt(when, "Asia/Makassar")} WITA · ${fmt(when, "Asia/Jakarta")} WIB</div>
    <div class="mt-1 font-mono text-[11px] text-slate-500">${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}</div>
  </div>`;

        new maplibregl.Popup({ maxWidth: "260px", focusAfterOpen: false })
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

  const [open, setOpen] = useState(true);
  const totalDetections = items.reduce((s, i) => s + i.hotspots, 0);
  const totalFrp = items.reduce((s, i) => s + i.totalFrp, 0);
  const max = Math.max(1, ...top.map((i) => i[sortKey]));

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("gibs")) return;
    map.setLayoutProperty("gibs", "visibility", satellite ? "visible" : "none");
  }, [satellite]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      <div ref={container} className="h-full w-full" />

      {/* vignette so the map edges fade into the UI */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,6,23,0.65)_100%)]" />

      <aside className="absolute left-4 top-4 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-xl">
        {/* header */}
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-orange-400">
              Karhutla Watch
            </div>
            <div className="text-sm font-semibold">Kalimantan hotspots</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {latest ? hoursAgo(latest) : "loading"}
            <span className="text-slate-500">{open ? "▾" : "▸"}</span>
          </div>
        </button>

        {open && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 pb-4">
            {/* stat tiles */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Detections · 48 h
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {totalDetections.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  FRP sum
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {totalFrp.toLocaleString()}
                </div>
              </div>
            </div>

            {/* segmented control */}
            <div className="flex rounded-lg bg-black/30 p-1 text-xs">
              {(
                [
                  ["hotspots", "Count"],
                  ["totalFrp", "FRP"],
                  ["per1000km2", "Density"],
                ] as [SortKey, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`flex-1 rounded-md py-1.5 font-medium transition ${
                    sortKey === k
                      ? "bg-orange-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* satellite toggle */}
            <button
              onClick={() => setSatellite(!satellite)}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10"
            >
              <span className="font-medium">Satellite imagery</span>
              <span
                className="flex h-4 w-7 shrink-0 items-center rounded-full bg-slate-600 p-0.5 transition data-[on=true]:bg-orange-500"
                data-on={satellite}
              >
                <span
                  className={`block h-3 w-3 rounded-full bg-white shadow transition-transform ${satellite ? "translate-x-3" : "translate-x-0"}`}
                />
              </span>
            </button>

            {/* ranking with bars */}
            <ol className="space-y-1">
              {top.map((it, i) => (
                <li key={it.code}>
                  <button
                    onClick={() =>
                      mapRef.current?.fitBounds(it.bounds, {
                        padding: 60,
                        duration: 900,
                      })
                    }
                    className="group relative w-full overflow-hidden rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-white/5"
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500/25 to-transparent"
                      style={{ width: `${(it[sortKey] / max) * 100}%` }}
                    />
                    <span className="relative flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-4 font-mono text-slate-500">
                          {i + 1}
                        </span>
                        <span className="font-medium">{it.name}</span>
                      </span>
                      <span className="tabular-nums text-slate-300">
                        {sortKey === "hotspots" && it.hotspots.toLocaleString()}
                        {sortKey === "totalFrp" && it.totalFrp.toLocaleString()}
                        {sortKey === "per1000km2" &&
                          `${it.per1000km2} /1000 km²`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <p className="text-[10px] leading-snug text-slate-500">
              Satellite thermal detections from three VIIRS satellites, not
              confirmed fires. The same fire can be detected more than once, and
              FRP sum is an activity index, not total power.
            </p>
          </div>
        )}
      </aside>

      {/* legend */}
      <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[10px] text-slate-400 backdrop-blur-xl">
        <div className="mb-1 uppercase tracking-wider">
          Fire radiative power
        </div>
        <div className="h-1.5 w-40 rounded-full bg-gradient-to-r from-yellow-300 via-orange-400 via-60% to-rose-200" />
        <div className="mt-1 flex justify-between">
          <span>low</span>
          <span>high</span>
        </div>
      </div>

      {/* credits */}
      <div className="absolute bottom-4 right-4 text-[10px] text-slate-500">
        Data: NASA FIRMS (VIIRS) · Boundaries: BIG
      </div>
    </div>
  );
}
