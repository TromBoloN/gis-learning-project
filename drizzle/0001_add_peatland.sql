CREATE TABLE "peatland" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_kab" text NOT NULL,
	"nama_kab" text NOT NULL,
	"kode_prov" text NOT NULL,
	"nama_prov" text NOT NULL,
	"geom" geometry(MultiPolygon,4326) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "peatland_geom" ON "peatland" USING gist ("geom");
--> statement-breakpoint
CREATE INDEX "peatland_kode_kab" ON "peatland" USING btree ("kode_kab");
