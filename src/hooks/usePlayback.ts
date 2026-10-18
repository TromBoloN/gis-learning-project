import { useEffect, useState } from "react";
import type { Span } from "@/lib/types";

export function usePlayback(span: Span | null) {
  const [cursor, setCursor] = useState<number | null>(null); // null = show all
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setCursor(null);
    setPlaying(false);
  }, [span]);

  useEffect(() => {
    if (!playing || !span) return;
    const step = (span.max - span.min) / 200; // ~12 s end to end
    const id = setInterval(
      () => setCursor((c) => Math.min(span.max, (c ?? span.min) + step)),
      60,
    );
    return () => clearInterval(id);
  }, [playing, span]);

  useEffect(() => {
    if (playing && span && cursor !== null && cursor >= span.max) {
      setPlaying(false);
      setCursor(null);
    }
  }, [cursor, playing, span]);

  return {
    cursor,
    playing,
    togglePlay: () => setPlaying((p) => !p),
    scrub: (t: number) => {
      setPlaying(false);
      setCursor(t);
    },
    stop: () => setPlaying(false),
  };
}