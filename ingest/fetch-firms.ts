import "dotenv/config";
import Papa from "papaparse";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hotspots } from "../src/db/schema";

const KEY = process.env.FIRMS_MAP_KEY;
const DB = process.env.DATABASE_URL;
if (!KEY || !DB) throw new Error("FIRMS_MAP_KEY and DATABASE_URL must be set in .env");

const BBOX = "108,-4.5,119.5,4.5"; // west,south,east,north
const SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"];
const DAYS = Number(process.argv[2] ?? 1); // 1-5

type Row = {
  latitude: string; longitude: string; bright_ti4: string; scan: string; track: string;
  acq_date: string; acq_time: string; satellite: string; instrument: string;
  confidence: string; version: string; bright_ti5: string; frp: string; daynight: string;
};

const num = (v: string) => (v === "" || v == null ? null : Number(v));

function parseAcquired(date: string, time: string): Date {
  const t = time.padStart(4, "0");
  return new Date(`${date}T${t.slice(0, 2)}:${t.slice(2)}:00Z`);
}

async function fetchSource(source: string) {
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${KEY}/${source}/${BBOX}/${DAYS}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || !text.startsWith("latitude")) {
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }
  return Papa.parse<Row>(text, { header: true, skipEmptyLines: true }).data;
}

async function main() {
  const client = postgres(DB!);
  const db = drizzle(client);
  let failures = 0;

  for (const source of SOURCES) {
    try {
      const data = await fetchSource(source);
      const values = data.map((r) => {
        const lat = Number(r.latitude);
        const lon = Number(r.longitude);
        return {
          geom: { x: lon, y: lat },
          latitude: lat,
          longitude: lon,
          acquiredAt: parseAcquired(r.acq_date, r.acq_time),
          satellite: r.satellite,
          instrument: r.instrument || null,
          confidence: r.confidence,
          frp: num(r.frp),
          brightTi4: num(r.bright_ti4),
          brightTi5: num(r.bright_ti5),
          scan: num(r.scan),
          track: num(r.track),
          dayNight: r.daynight || null,
          version: r.version || null,
          source,
        };
      });

      let inserted = 0;
      for (let i = 0; i < values.length; i += 500) {
        const rows = await db
          .insert(hotspots)
          .values(values.slice(i, i + 500))
          .onConflictDoNothing()
          .returning({ id: hotspots.id });
        inserted += rows.length;
      }
      console.log(`${source}: fetched ${values.length}, inserted ${inserted}`);
    } catch (e) {
      failures++;
      console.error(`${source} failed:`, e instanceof Error ? e.message : e);
    }
  }

  // tag once, after all sources are in
  const inside = await client`
    UPDATE hotspots h
    SET kabupaten_code = k.kode_kab, province_code = k.kode_prov
    FROM kabupaten k
    WHERE h.kabupaten_code IS NULL AND ST_Contains(k.geom, h.geom)
    RETURNING h.id`;
  const coastal = await client`
    UPDATE hotspots h
    SET kabupaten_code = k.kode_kab, province_code = k.kode_prov
    FROM kabupaten k
    WHERE h.kabupaten_code IS NULL
      AND ST_DWithin(k.geom::geography, h.geom::geography, 1000)
    RETURNING h.id`;
  console.log(`Tagged ${inside.length} inside + ${coastal.length} coastal`);

  await client.end();
  if (failures === SOURCES.length) process.exit(1); // only fail if everything failed
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});