CREATE TABLE "hotspots" (
	"id" serial PRIMARY KEY NOT NULL,
	"geom" geometry(Point,4326) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"acquired_at" timestamp with time zone NOT NULL,
	"satellite" text NOT NULL,
	"instrument" text,
	"confidence" text NOT NULL,
	"frp" double precision,
	"bright_ti4" double precision,
	"bright_ti5" double precision,
	"scan" double precision,
	"track" double precision,
	"day_night" text,
	"version" text,
	"province_code" text,
	"kabupaten_code" text,
	"on_peat" boolean,
	"source" text DEFAULT 'VIIRS_SNPP_NRT' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hotspots_dedupe" ON "hotspots" USING btree ("latitude","longitude","acquired_at","satellite");--> statement-breakpoint
CREATE INDEX "hotspots_time" ON "hotspots" USING btree ("acquired_at");--> statement-breakpoint
CREATE INDEX "hotspots_geom" ON "hotspots" USING gist ("geom");