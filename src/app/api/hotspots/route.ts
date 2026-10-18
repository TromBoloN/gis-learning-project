import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

// reuse one connection across hot reloads in dev
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = globalForDb.pg ?? postgres(process.env.DATABASE_URL!, { max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;
const db = drizzle(client);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date();
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(to.getTime() - 48 * 36e5);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "invalid from/to" }, { status: 400 });
  }

  const rows = await db.execute(sql`
    SELECT h.latitude, h.longitude, h.acquired_at, h.satellite, h.confidence,
           h.frp, h.bright_ti4, k.nama_kab, k.nama_prov
    FROM hotspots h
    JOIN kabupaten k ON k.kode_kab = h.kabupaten_code
    WHERE h.acquired_at >= ${from.toISOString()} AND h.acquired_at <= ${to.toISOString()}
    ORDER BY h.acquired_at DESC
    LIMIT 20000`);

  const features = (rows as unknown as Record<string, any>[]).map((r) => ({
    type: "Feature" as const,
    properties: {
      acquired_at: new Date(r.acquired_at).toISOString(),
      satellite: r.satellite,
      confidence: r.confidence,
      frp: r.frp,
      bright_ti4: r.bright_ti4,
      kabupaten: r.nama_kab,
      province: r.nama_prov,
    },
    geometry: { type: "Point" as const, coordinates: [r.longitude, r.latitude] },
  }));

  return NextResponse.json(
    { type: "FeatureCollection", features, meta: { from: from.toISOString(), to: to.toISOString(), count: features.length } },
    { headers: { "Cache-Control": "public, s-maxage=60" } },
  );
}