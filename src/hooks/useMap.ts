import { useEffect, useRef, useState, type RefObject } from "react";
import maplibregl, { type MapInstance } from "@/lib/maplibre";
import { addBaseLayers, addHotspotLayers } from "@/lib/mapLayers";
import { attachHotspotInteractions } from "@/lib/popup";

export function useMap(container: RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<MapInstance | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "bg", type: "background", paint: { "background-color": "#0f172a" } }],
      },
      center: [114, 0],
      zoom: 5,
    });
    mapRef.current = map;

    map.on("load", () => {
      addBaseLayers(map);
      addHotspotLayers(map);
      attachHotspotInteractions(map);
      setReady(true);
    });

    return () => {
      setReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [container]);

  return { mapRef, ready };
}