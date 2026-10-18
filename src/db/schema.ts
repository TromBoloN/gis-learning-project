import {
  pgTable, serial, doublePrecision, text, boolean, timestamp,
  geometry, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const hotspots = pgTable(
  "hotspots",
  {
    id: serial("id").primaryKey(),
    geom: geometry("geom", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(), // acq_date + padded acq_time, UTC
    satellite: text("satellite").notNull(),     // N, N20, N21
    instrument: text("instrument"),             // VIIRS
    confidence: text("confidence").notNull(),   // l / n / h
    frp: doublePrecision("frp"),                // MW
    brightTi4: doublePrecision("bright_ti4"),
    brightTi5: doublePrecision("bright_ti5"),
    scan: doublePrecision("scan"),
    track: doublePrecision("track"),
    dayNight: text("day_night"),                // D / N (CSV column: daynight)
    version: text("version"),                   // e.g. 2.0NRT
    provinceCode: text("province_code"),
    kabupatenCode: text("kabupaten_code"),
    onPeat: boolean("on_peat"),
    source: text("source").notNull().default("VIIRS_SNPP_NRT"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hotspots_dedupe").on(t.latitude, t.longitude, t.acquiredAt, t.satellite),
    index("hotspots_time").on(t.acquiredAt),
    index("hotspots_geom").using("gist", t.geom),
  ],
);