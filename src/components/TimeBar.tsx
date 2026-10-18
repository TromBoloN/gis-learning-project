import { RANGES } from "@/lib/constants";
import { fmt } from "@/lib/format";
import type { RangeHours, Span } from "@/lib/types";

type Props = {
  span: Span | null;
  cursor: number | null;
  playing: boolean;
  hours: RangeHours;
  onTogglePlay: () => void;
  onScrub: (t: number) => void;
  onHours: (h: RangeHours) => void;
};

export default function TimeBar({
  span,
  cursor,
  playing,
  hours,
  onTogglePlay,
  onScrub,
  onHours,
}: Props) {
  return (
    <div className="absolute bottom-4 left-1/2 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          disabled={!span}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-500 text-xs text-slate-950 disabled:opacity-40"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          disabled={!span}
          min={span?.min ?? 0}
          max={span?.max ?? 1}
          step={600000}
          value={cursor ?? span?.max ?? 0}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-orange-500"
        />
        <div className="flex rounded-lg bg-black/30 p-0.5 text-xs">
          {RANGES.map(([h, label]) => (
            <button
              key={h}
              onClick={() => onHours(h)}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                hours === h
                  ? "bg-orange-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{span ? fmt(new Date(span.min), "Asia/Jakarta") : ""}</span>
        <span className="text-slate-200">
          {cursor !== null
            ? `Up to ${fmt(new Date(cursor), "Asia/Jakarta")} WIB`
            : "Showing all"}
        </span>
        <span>{span ? fmt(new Date(span.max), "Asia/Jakarta") : ""}</span>
      </div>
    </div>
  );
}
