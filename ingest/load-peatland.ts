import "dotenv/config";
import fs from "node:fs/promises";
import postgres from "postgres";

type PeatFeature = {
  type: "Feature";
  geometry: unknown;
  properties: {
    province_geocode: string;
    kabupaten_geocode: string;
    province_name: string;
    kabupaten_name: string;
  };
};

type PeatCollection = {
  type: "FeatureCollection";
  features: PeatFeature[];
};

const file = process.argv[2] ?? "data/raw/peatland-kabupaten.geojson";
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL must be set in .env");

const data = JSON.parse(await fs.readFile(file, "utf8")) as PeatCollection;
const sql = postgres(dbUrl);
const kalimantan = new Set(["61", "62", "63", "64", "65"]);

await sql`
  CREATE TABLE IF NOT EXISTS peatland (
    id serial PRIMARY KEY,
    kode_kab text NOT NULL,
    nama_kab text NOT NULL,
    kode_prov text NOT NULL,
    nama_prov text NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL
  )`;
await sql`CREATE INDEX IF NOT EXISTS peatland_geom ON peatland USING gist (geom)`;
await sql`CREATE INDEX IF NOT EXISTS peatland_kode_kab ON peatland (kode_kab)`;
await sql`TRUNCATE peatland RESTART IDENTITY`;

let loaded = 0;
for (const feature of data.features) {
  const p = feature.properties;
  if (!kalimantan.has(p.province_geocode)) continue;

  await sql`
    INSERT INTO peatland (kode_kab, nama_kab, kode_prov, nama_prov, geom)
    VALUES (
      ${p.kabupaten_geocode},
      ${p.kabupaten_name},
      ${p.province_geocode},
      ${p.province_name},
      ST_Multi(ST_CollectionExtract(
        ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}), 4326)),
        3
      ))
    )`;
  loaded++;
}

console.log(`Loaded ${loaded} Kalimantan peatland features from ${file}`);
await sql.end();
