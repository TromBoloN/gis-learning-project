import { useEffect, useState } from "react";
import type { Item } from "@/lib/types";

export function useRanking(hours: number) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const from = new Date(Date.now() - hours * 36e5).toISOString();
    fetch(`/api/ranking?from=${from}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? `ranking request failed (${r.status})`);
        return body;
      })
      .then((d) => setItems(d.items))
      .catch((e) => console.warn("ranking failed", e));
  }, [hours]);
  return items;
}