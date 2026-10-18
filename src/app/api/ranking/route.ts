import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

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
    SELECT k.kode_kab, k.nama_kab, k.nama_prov,
           ROUND((ST_Area(k.geom::geography) / 1e6)::numeric) AS area_km2,
           ST_XMin(k.geom) AS xmin, ST_YMin(k.geom) AS ymin,
           ST_XMax(k.geom) AS xmax, ST_YMax(k.geom) AS ymax,
           COUNT(h.id)::int AS hotspots,
           COALESCE(ROUND(SUM(h.frp)::numeric), 0)::int AS total_frp
    FROM kabupaten k
    LEFT JOIN hotspots h
      ON h.kabupaten_code = k.kode_kab
     AND h.acquired_at >= ${from.toISOString()}
     AND h.acquired_at <= ${to.toISOString()}
    GROUP BY k.kode_kab, k.nama_kab, k.nama_prov, k.geom
    ORDER BY hotspots DESC`);

  const data = (rows as unknown as Record<string, any>[]).map((r) => ({
    code: r.kode_kab,
    name: r.nama_kab,
    province: r.nama_prov,
    areaKm2: Number(r.area_km2),
    hotspots: r.hotspots,
    totalFrp: r.total_frp,
    per1000km2: Number(r.area_km2) > 0 ? +(r.hotspots / (Number(r.area_km2) / 1000)).toFixed(1) : 0,
    bounds: [[r.xmin, r.ymin], [r.xmax, r.ymax]],
  }));

  return NextResponse.json(
    { items: data, meta: { from: from.toISOString(), to: to.toISOString() } },
    { headers: { "Cache-Control": "public, s-maxage=60" } },
  );
}