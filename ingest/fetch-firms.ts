import "dotenv/config";
import Papa from "papaparse";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hotspots } from "../src/db/schema";

const KEY = process.env.FIRMS_MAP_KEY;
const DB = process.env.DATABASE_URL;
if (!KEY || !DB) throw new Error("FIRMS_MAP_KEY and DATABASE_URL must be set in .env");

// west,south,east,north around Kalimantan
const BBOX = "108,-4.5,119.5,4.5";
// FIRMS source id, matches the schema's `source` default
const SOURCE = "VIIRS_SNPP_NRT";
// days to fetch (1-5). Keep small to save the 5000 transactions / 10 min quota
const DAYS = Number(process.argv[2] ?? 2);

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

async function main() {
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${KEY}/${SOURCE}/${BBOX}/${DAYS}`;
  const res = await fetch(url);
  const text = await res.text();

  // FIRMS returns errors as plain text with status 200 sometimes, so check the header too
  if (!res.ok || !text.startsWith("latitude")) {
    throw new Error(`FIRMS request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const { data } = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  console.log(`Fetched ${data.length} rows`);

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
      source: SOURCE,
    };
  });

  const client = postgres(DB!);
  const db = drizzle(client);

  let inserted = 0;
  const CHUNK = 500; // keeps each INSERT under Postgres's parameter limit
  for (let i = 0; i < values.length; i += CHUNK) {
    const rows = await db
      .insert(hotspots)
      .values(values.slice(i, i + CHUNK))
      .onConflictDoNothing()
      .returning({ id: hotspots.id });
    inserted += rows.length;
  }

         // pass 1: exact containment (uses the GiST index)
  const inside = await client`
    UPDATE hotspots h
    SET kabupaten_code = k.kode_kab, province_code = k.kode_prov
    FROM kabupaten k
    WHERE h.kabupaten_code IS NULL AND ST_Contains(k.geom, h.geom)
    RETURNING h.id`;

  // pass 2: coastal leftovers within 1 km (pixel centers vs. simplified coastline)
  const coastal = await client`
    UPDATE hotspots h
    SET kabupaten_code = k.kode_kab, province_code = k.kode_prov
    FROM kabupaten k
    WHERE h.kabupaten_code IS NULL
      AND ST_DWithin(k.geom::geography, h.geom::geography, 1000)
    RETURNING h.id`;

  console.log(`Tagged ${inside.length} inside + ${coastal.length} coastal`);

  console.log(`Inserted ${inserted} new rows (${values.length - inserted} duplicates skipped)`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});