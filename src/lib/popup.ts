import maplibregl, { type MapInstance } from "./maplibre";
import { CONFIDENCE, SATELLITES } from "./constants";
import { fmt, hoursAgo } from "./format";
import type { HotspotProps } from "./types";

function popupHtml(p: HotspotProps, coords: [number, number]): string {
  const when = new Date(p.acquired_at);
  return `
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
}

export function attachHotspotInteractions(map: MapInstance) {
  map.on("click", "hotspots-circles", (e: any) => {
    const f = e.features?.[0];
    if (!f) return;
    const coords = f.geometry.coordinates as [number, number];
    new maplibregl.Popup({ maxWidth: "260px", focusAfterOpen: false })
      .setLngLat(coords)
      .setHTML(popupHtml(f.properties as HotspotProps, coords))
      .addTo(map);
  });
  map.on("mouseenter", "hotspots-circles", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "hotspots-circles", () => (map.getCanvas().style.cursor = ""));
}