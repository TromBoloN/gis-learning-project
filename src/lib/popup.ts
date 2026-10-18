import maplibregl, { type MapInstance } from "./maplibre";
import { CONFIDENCE, SATELLITES } from "./constants";
import { fmt, hoursAgo } from "./format";
import type { HotspotProps } from "./types";

// same stops as the map's color ramp in mapLayers.ts
const STOPS: [number, string][] = [
  [0, "#fde047"],
  [5, "#fb923c"],
  [15, "#ef4444"],
  [40, "#fecdd3"],
];

function frpColor(frp: number): string {
  if (frp <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [x1, c1] = STOPS[i];
    if (frp <= x1) {
      const [x0, c0] = STOPS[i - 1];
      const t = (frp - x0) / (x1 - x0);
      const a = parseInt(c0.slice(1), 16);
      const b = parseInt(c1.slice(1), 16);
      const ch = (shift: number) =>
        Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
      return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
    }
  }
  return STOPS[STOPS.length - 1][1];
}

// West and Central Kalimantan use WIB (UTC+7); the rest of Kalimantan uses WITA (UTC+8)
function localZone(province: string) {
  const wib = province === "Kalimantan Barat" || province === "Kalimantan Tengah";
  return wib
    ? { tz: "Asia/Jakarta", label: "WIB" }
    : { tz: "Asia/Makassar", label: "WITA" };
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function popupHtml(p: HotspotProps, coords: [number, number]): string {
  const when = new Date(p.acquired_at);
  const frp = Number(p.frp ?? 0);
  const color = frpColor(frp);
  const pct = Math.min(frp / 40, 1) * 100;
  const zone = localZone(p.province);

  return `
  <div class="w-60 text-[13px] leading-relaxed">
    <div class="flex items-center gap-2">
      <span class="inline-block h-2 w-2 rounded-full" style="background:${color};box-shadow:0 0 8px ${color}"></span>
      <span class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Thermal detection</span>
    </div>

    <div class="mt-2 text-base font-semibold leading-tight text-white">${esc(p.kabupaten)}</div>
    <div class="text-xs text-slate-400">${esc(p.province)}</div>

    <div class="mt-3 rounded-xl bg-white/5 p-3">
      <div class="text-[10px] uppercase tracking-wider text-slate-500">Fire radiative power</div>
      <div class="mt-0.5 flex items-baseline gap-1">
        <span class="text-3xl font-semibold tabular-nums" style="color:${color}">${frp.toFixed(1)}</span>
        <span class="text-xs text-slate-500">MW</span>
      </div>
      <div class="mt-2 h-1 overflow-hidden rounded-full bg-slate-700/60">
        <div class="h-full rounded-full" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-x-2">
      <div>
        <div class="text-[10px] uppercase tracking-wider text-slate-500">Bright</div>
        <div class="font-medium tabular-nums">${esc(p.bright_ti4)} K</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wider text-slate-500">Conf.</div>
        <div class="font-medium">${esc(CONFIDENCE[p.confidence] ?? p.confidence)}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wider text-slate-500">Sat.</div>
        <div class="font-medium">${esc(SATELLITES[p.satellite] ?? p.satellite)}</div>
      </div>
    </div>

    <div class="my-3 h-px bg-slate-700/70"></div>

    <div class="font-medium text-slate-200">${fmt(when, zone.tz)} ${zone.label}</div>
    <div class="text-xs text-slate-500">${fmt(when, "UTC")} UTC · ${hoursAgo(when)}</div>
    <div class="mt-1 font-mono text-[11px] text-slate-500">${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}</div>
  </div>`;
}

export function attachHotspotInteractions(map: MapInstance) {
  map.on("click", "hotspots-circles", (e: any) => {
    const f = e.features?.[0];
    if (!f) return;
    const coords = f.geometry.coordinates as [number, number];
    new maplibregl.Popup({ maxWidth: "280px", focusAfterOpen: false })
      .setLngLat(coords)
      .setHTML(popupHtml(f.properties as HotspotProps, coords))
      .addTo(map);
  });
  map.on("mouseenter", "hotspots-circles", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "hotspots-circles", () => (map.getCanvas().style.cursor = ""));
}