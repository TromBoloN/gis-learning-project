import "dotenv/config";
import fs from "node:fs";
import readline from "node:readline";
import postgres from "postgres";

const file = process.argv[2];
if (!file) throw new Error("usage: bun run ingest/load-admin.ts path/to/file.geojson");

const sql = postgres(process.env.DATABASE_URL!);
const KALIMANTAN = new Set(["61", "62", "63", "64", "65"]);

await sql`
  CREATE TABLE IF NOT EXISTS kabupaten (
    id serial PRIMARY KEY,
    kode_kab text, nama_kab text,
    kode_prov text, nama_prov text,
    geom geometry(MultiPolygon, 4326) NOT NULL
  )`;
await sql`CREATE INDEX IF NOT EXISTS kabupaten_geom ON kabupaten USING gist (geom)`;
await sql`TRUNCATE kabupaten RESTART IDENTITY`;


const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
let seen = 0, kept = 0;

for await (let line of rl) {
  line = line.trim();
  if (!line.startsWith('{"type":"Feature"')) continue;
  if (line.endsWith(",")) line = line.slice(0, -1);
  if (line.endsWith("]}")) line = line.slice(0, -2); // last feature closes the collection
  seen++;

  const f = JSON.parse(line);
  const p = f.properties;
  if (!KALIMANTAN.has(p.KDPPUM)) continue;
  await sql`
    INSERT INTO kabupaten (kode_kab, nama_kab, kode_prov, nama_prov, geom)
    VALUES (${p.KDPKAB}, ${p.WADMKK}, ${p.KDPPUM}, ${p.WADMPR},
      ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(f.geometry)}), 4326)), 3)))`;
  kept++;
  if (kept % 500 === 0) console.log(`kept ${kept} of ${seen} read`);
}

console.log(`Done: read ${seen} features, loaded ${kept} Kalimantan Kabupaten`);
await sql.end();