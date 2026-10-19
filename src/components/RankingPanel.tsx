import { useState } from "react";
import { hoursAgo, rangeLabel } from "@/lib/format";
import type { Item, SortKey } from "@/lib/types";

type Props = {
  items: Item[];
  latest: Date | null;
  hours: number;
  satellite: boolean;
  onToggleSatellite: () => void;
  peatland: boolean;
  onTogglePeatland: () => void;
  onSelect: (bounds: Item["bounds"]) => void;
};

const SORTS: [SortKey, string][] = [
  ["hotspots", "Count"],
  ["totalFrp", "FRP"],
  ["per1000km2", "Density"],
];

export default function RankingPanel({
  items,
  latest,
  hours,
  satellite,
  onToggleSatellite,
  peatland,
  onTogglePeatland,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("hotspots");

  const top = [...items].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 10);
  const totalDetections = items.reduce((s, i) => s + i.hotspots, 0);
  const totalFrp = items.reduce((s, i) => s + i.totalFrp, 0);
  const max = Math.max(1, ...top.map((i) => i[sortKey]));

  return (
    <aside className="absolute left-4 top-4 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-xl">
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
          {latest ? `Latest pass ${hoursAgo(latest)}` : "loading"}
          <span className="text-slate-500">{open ? "▾" : "▸"}</span>
        </div>
      </button>

      {open && (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label={`Detections · ${rangeLabel(hours)}`}
              value={totalDetections}
            />
            <Stat label="FRP sum" value={totalFrp} />
            <Stat
              label="On mapped peat"
              value={items.reduce((s, i) => s + i.peatHotspots, 0)}
            />
          </div>

          <div className="flex rounded-lg bg-black/30 p-1 text-xs">
            {SORTS.map(([k, label]) => (
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

          <button
            onClick={onTogglePeatland}
            className="flex w-full items-center justify-between rounded-lg border border-lime-300/20 bg-lime-300/5 px-3 py-2 text-xs transition hover:bg-lime-300/10"
          >
            <span className="font-medium">Mapped peatland</span>
            <span className={`flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition ${peatland ? "bg-lime-400" : "bg-slate-600"}`}>
              <span className={`block h-3 w-3 rounded-full bg-white shadow transition-transform ${peatland ? "translate-x-3" : "translate-x-0"}`} />
            </span>
          </button>

          <button
            onClick={onToggleSatellite}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10"
          >
            <span className="font-medium">Satellite imagery</span>
            <span
              className={`flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition ${
                satellite ? "bg-orange-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                  satellite ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </span>
          </button>

          <ol className="space-y-1">
            {top.map((it, i) => (
              <li key={it.code}>
                <button
                  onClick={() => onSelect(it.bounds)}
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
                      {sortKey === "per1000km2"
                        ? `${it.per1000km2} /1000 km²`
                        : it[sortKey].toLocaleString()}
                    </span>
                  </span>
                  <span className="relative mt-1 block pl-6 text-[10px] text-lime-300/70">
                    {it.peatShare}% on mapped peat
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <p className="text-[10px] leading-snug text-slate-500">
            Satellite thermal detections from three VIIRS satellites, not
            confirmed fires. The same fire can be detected more than once, and
            FRP sum is an activity index, not total power.
            Mapped peatland is an estimate; a detection on peat is not proof of a peat fire.
          </p>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
