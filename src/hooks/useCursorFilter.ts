import { useEffect, type RefObject } from "react";
import type { MapInstance } from "@/lib/maplibre";

export function useCursorFilter(
  mapRef: RefObject<MapInstance | null>,
  ready: boolean,
  cursor: number | null,
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const filter = cursor == null ? null : ["<=", ["get", "t"], cursor];
    for (const id of ["hotspots-glow", "hotspots-circles"]) {
      if (map.getLayer(id)) map.setFilter(id, filter as any);
    }
  }, [mapRef, ready, cursor]);
}