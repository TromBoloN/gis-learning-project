import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type Feature = {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, unknown>;
};

export async function GET() {
  const file = path.join(process.cwd(), "data", "raw", "peatland-kabupaten.geojson");
  const collection = JSON.parse(await fs.readFile(file, "utf8")) as {
    type: "FeatureCollection";
    features: Feature[];
  };
  const features = collection.features.filter((feature) => {
    const code = feature.properties.province_geocode;
    return ["61", "62", "63", "64", "65"].includes(String(code));
  });

  return NextResponse.json(
    {
      type: "FeatureCollection",
      features,
      meta: { source: "peatland-kabupaten.geojson", label: "Mapped peatland" },
    },
    { headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
