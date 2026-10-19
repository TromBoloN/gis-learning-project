"use client";

import { useRef, useState } from "react";
import { useMap } from "@/hooks/useMap";
import { useRanking } from "@/hooks/useRanking";
import { useHotspots } from "@/hooks/useHotspots";
import { usePlayback } from "@/hooks/usePlayback";
import { useCursorFilter } from "@/hooks/useCursorFilter";
import { useImagery } from "@/hooks/useImagery";
import RankingPanel from "./RankingPanel";
import TimeBar from "./TimeBar";
import Legend from "./Legend";
import type { RangeHours } from "@/lib/types";

export default function HotspotMap() {
  const container = useRef<HTMLDivElement>(null);
  const { mapRef, ready } = useMap(container);

  const [hours, setHours] = useState<RangeHours>(48);
  const [satellite, setSatellite] = useState(false);
  const [peatland, setPeatland] = useState(false);

  const items = useRanking(hours);
  const { span, latest } = useHotspots(mapRef, ready, hours);
  const { cursor, playing, togglePlay, scrub } = usePlayback(span);

  useCursorFilter(mapRef, ready, cursor);
  useImagery(mapRef, ready, satellite);

  const togglePeatland = () => {
    const next = !peatland;
    setPeatland(next);
    for (const id of ["peatland-fill", "peatland-line"]) {
      mapRef.current?.setLayoutProperty(id, "visibility", next ? "visible" : "none");
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      <div ref={container} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,6,23,0.65)_100%)]" />

      <RankingPanel
        items={items}
        latest={latest}
        hours={hours}
        satellite={satellite}
        onToggleSatellite={() => setSatellite((s) => !s)}
        peatland={peatland}
        onTogglePeatland={togglePeatland}
        onSelect={(b) =>
          mapRef.current?.fitBounds(b, { padding: 60, duration: 900 })
        }
      />
      <Legend />
      <TimeBar
        span={span}
        cursor={cursor}
        playing={playing}
        hours={hours}
        onTogglePlay={togglePlay}
        onScrub={scrub}
        onHours={setHours}
      />

      <div className="absolute bottom-4 right-14 text-[10px] text-slate-500">
        Data: NASA FIRMS (VIIRS) · Boundaries: BIG
      </div>
    </div>
  );
}
