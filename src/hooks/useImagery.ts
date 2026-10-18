import { useEffect, type RefObject } from "react";
import type { MapInstance } from "@/lib/maplibre";

export function useImagery(mapRef: RefObject<MapInstance | null>, ready: boolean, on: boolean) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer("gibs")) return;
    map.setLayoutProperty("gibs", "visibility", on ? "visible" : "none");
    map.setPaintProperty("borders-fill", "fill-opacity", on ? 0 : 1);
  }, [mapRef, ready, on]);
}