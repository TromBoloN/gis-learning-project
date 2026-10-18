import { useEffect, useState } from "react";
import type { Item } from "@/lib/types";

export function useRanking(hours: number) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const from = new Date(Date.now() - hours * 36e5).toISOString();
    fetch(`/api/ranking?from=${from}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items))
      .catch((e) => console.warn("ranking failed", e));
  }, [hours]);
  return items;
}