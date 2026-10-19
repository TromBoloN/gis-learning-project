import { useEffect, useState, type RefObject } from "react";
import type { MapInstance } from "@/lib/maplibre";
import type { Span } from "@/lib/types";

export function useHotspots(mapRef: RefObject<MapInstance | null>, ready: boolean, hours: number) {
  const [span, setSpan] = useState<Span | null>(null);
  const [latest, setLatest] = useState<Date | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const ctrl = new AbortController();
    const from = new Date(Date.now() - hours * 36e5).toISOString();

    fetch(`/api/hotspots?from=${from}`, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? `hotspots request failed (${r.status})`);
        return body;
      })
      .then((g) => {
        const src = map.getSource("hotspots") as any;
        if (!src) return;
        src.setData(g);
        let min = Infinity, max = -Infinity;
        for (const f of g.features) {
          const t = f.properties.t;
          if (t < min) min = t;
          if (t > max) max = t;
        }
        if (g.features.length) {
          setSpan({ min, max });
          setLatest(new Date(max));
        } else setSpan(null);
      })
      .catch((e) => e.name !== "AbortError" && console.warn("hotspots failed", e));

    return () => ctrl.abort();
  }, [mapRef, ready, hours]);

  return { span, latest };
}