# Karhutla Map — Kalimantan Fire Monitoring GIS

A historical and Near Real-Time (NRT) fire-monitoring Geographic Information System (GIS) platform for Kalimantan, developed incrementally by the study club.

Rather than just displaying pins on a map, this platform is an end-to-end system designed to **collect, preserve, analyze, and visualize** satellite fire observations over time alongside administrative boundaries and environmental contexts (peatland sebaran lahan gambut & daily satellite reflectance).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [How to Run (Quick Start)](#how-to-run-quick-start)
  - [Prerequisites](#prerequisites)
  - [1. Environment Setup](#1-environment-setup)
  - [2. Start the Spatial Database](#2-start-the-spatial-database)
  - [3. Apply Database Migrations](#3-apply-database-migrations)
  - [4. Ingest Base Spatial Layers](#4-ingest-base-spatial-layers)
  - [5. Ingest NASA FIRMS Hotspot Data](#5-ingest-nasa-firms-hotspot-data)
  - [6. Start the Web Application](#6-start-the-web-application)
- [Current Features](#current-features)
- [Project Progress & Roadmap](#project-progress--roadmap)
  - [Roadmap Status (Phases 0–6)](#roadmap-status-phases-06)
  - [Minimum Viable Product (MVP) Checklist](#minimum-viable-product-mvp-checklist)
- [Future Plans & Next Steps](#future-plans--next-steps)
- [Data Sources & Attributions](#data-sources--attributions)

---

## Project Overview

Kalimantan faces recurrent peatland and forest fires (_kebakaran hutan dan lahan_ / karhutla), particularly during dry seasons and El Niño phases. Understanding these dynamics requires spatial and temporal depth:

- **Where are hotspots occurring?** Correlating satellite thermal anomalies with specific kabupaten administrative boundaries.
- **Are they occurring on peatlands?** Crossing thermal detections with mapped peatland polygons (_kesatuan hidrologis gambut_).
- **How intense and confident are the detections?** Sizing and coloring based on Fire Radiative Power (FRP in MW) and brightness temperature.
- **How do fire patterns evolve?** Interactive timeline scrubbing and multi-year comparative analytics.

---

## Architecture & Tech Stack

```
 NASA FIRMS API (VIIRS SNPP, NOAA-20, NOAA-21)
      │
      ▼
 Bun Ingest Pipeline (`ingest/fetch-firms.ts`)
      │  - Deduplication via Composite Unique Index
      │  - PostGIS Spatial Joins (ST_Contains & ST_DWithin)
      │  - Tagging Kabupaten & Peatland status
      ▼
 PostgreSQL 17 + PostGIS 3.5 (`karhutla-db` Docker container)
      │
      ▼
 Next.js 16 App Router API Routes (`/api/hotspots`, `/api/ranking`, `/api/peatland`)
      │
      ▼
 MapLibre GL v5 + React 19 + Tailwind CSS v4 Frontend
   - Hotspot vector rendering with dynamic FRP color scale
   - Time scrubber & 10-minute playback animation
   - Live analytical kabupaten rankings & peatland share
   - NASA GIBS True-Color daily satellite imagery
```

| Layer                   | Technologies                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend UI**         | [Next.js](https://nextjs.org) 16 (App Router), [React](https://react.dev) 19, [Tailwind CSS](https://tailwindcss.com) v4, TypeScript |
| **Mapping Engine**      | [MapLibre GL](https://maplibre.org) v5 (WebGL vector rendering)                                                                      |
| **Spatial Database**    | [PostgreSQL](https://www.postgresql.org) 17 + [PostGIS](https://postgis.net) 3.5 via Docker                                          |
| **ORM & Schema**        | [Drizzle ORM](https://orm.drizzle.team) & Drizzle Kit                                                                                |
| **Runtime & Tooling**   | [Bun](https://bun.sh) (fast package manager & TypeScript runtime)                                                                    |
| **Remote Sensing Data** | NASA FIRMS (VIIRS Active Fire), NASA GIBS WMTS (True Color corrected reflectance)                                                    |

---

## How to Run (Quick Start)

### Prerequisites

- [Bun](https://bun.sh) (v1.2+ recommended) or Node.js (v20+)
- [Docker](https://www.docker.com) & Docker Compose (for running the PostGIS database)
- A free **NASA FIRMS MAP KEY** ([Request one here](https://firms.modaps.eosdis.nasa.gov/api/map_key/))

### 1. Environment Setup

Clone the repository and install dependencies:

```bash
bun install
```

Create a `.env` file in the root directory:

```env
FIRMS_MAP_KEY=your_nasa_firms_map_key_here
DATABASE_URL=postgres://karhutla:karhutla@localhost:5433/karhutla
```

### 2. Start the Spatial Database

Spin up the containerized PostGIS instance:

```bash
docker compose up -d
```

Verify that the container `karhutla-db` is running and healthy:

```bash
docker ps
```

### 3. Apply Database Migrations

Push the Drizzle schema migrations to initialize tables (`hotspots`, spatial indices):

```bash
bun run db:migrate
```

### 4. Ingest Base Spatial Layers

Load the 56 Kalimantan kabupaten boundaries and mapped peatlands into PostGIS:

```bash
# 1. Load administrative boundaries (Kalimantan kabupaten)
bun run ingest:admin data/raw/desa-indonesia.geojson

# 2. Load mapped peatland polygons
bun run ingest:peatland
```

### 5. Ingest NASA FIRMS Hotspot Data

Fetch Near Real-Time (NRT) thermal detections from NASA's VIIRS satellites for Kalimantan (bounding box: `108, -4.5, 119.5, 4.5`). The optional argument specifies the number of days to fetch (1–5 days):

```bash
# Fetch the last 2 days of hotspot observations
bun run ingest:firms 2
```

The script automatically:

1. Queries 3 satellites: Suomi NPP, NOAA-20, NOAA-21.
2. Deduplicates records using `ON CONFLICT DO NOTHING` on `(latitude, longitude, acquired_at, satellite)`.
3. Performs a spatial join to associate each point with its `kabupaten_code` and `province_code`.
4. Tags points located within mapped peatland areas (`on_peat = true`).

### 6. Start the Web Application

Run the Next.js development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Current Features

- **High-Performance Map Visualization**:
  - Renders tens of thousands of thermal detections with WebGL hardware acceleration.
  - Sized and colored dynamically by **Fire Radiative Power (FRP)** using glowing visual hierarchies.
- **Detailed Thermal Detection Popups**:
  - Displays FRP (MW), Brightness temperature ($T_4$), Confidence level, and Satellite platform.
  - Formats timestamps to local Indonesian time zones: **WIB (UTC+7)** for West/Central Kalimantan and **WITA (UTC+8)** for South/East/North Kalimantan.
- **Temporal Analysis & Time Bar Scrubbing**:
  - Interactive playback controller with play/pause animations and a 10-minute scrubbing resolution.
  - Quick range selector: **24 hours**, **48 hours**, and **7 days**.
- **Live Regional Ranking Dashboard**:
  - Real-time aggregation of top kabupaten by **hotspot count**, **total FRP sum**, or **density per 1,000 km²**.
  - Calculates the percentage of detections occurring on **mapped peatlands** (_% on mapped peat_).
  - Clicking any kabupaten automatically smooth-zooms (`fitBounds`) to its geographical boundaries.
- **Contextual Environmental Layers**:
  - **Peatland Overlay**: Toggleable visual boundary of Kalimantan's peatland ecosystems.
  - **Daily NASA GIBS Satellite Imagery**: Toggleable true-color corrected reflectance satellite mosaic to observe smoke plumes and cloud cover.

---

## Project Progress & Roadmap

### Roadmap Status (Phases 0–6)

| Phase                              | Description                                                                           |       Status       | Current Output                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------- | :----------------: | ---------------------------------------------------------------------------------------------------- |
| **0. Research & Scope**            | Questions defined, FIRMS datasets selected, kabupaten & peatland boundaries gathered. |   **Completed**    | Kalimantan bounding box, PostGIS spatial schemas, administrative boundary datasets.                  |
| **1. Ingest & Storage**            | Ingest scripts, duplicate handling, spatial indexing, historical storage.             |  **In Progress**   | Working NRT pipeline with 21K+ records; multi-year historical archive backfill pending.              |
| **2. Map & Dashboard**             | Next.js interface, MapLibre GL map, popups, legend, date range selector.              |   **Completed**    | Full interactive map, FRP color ramp, localized WIB/WITA popups, GIBS imagery.                       |
| **3. Temporal & Spatial Analysis** | Time slider, weekly rankings, spatial joins, cross-year comparison.                   |  **In Progress**   | Working time scrubber, ranking by count/FRP/density & peat share; year-over-year comparison pending. |
| **4. Automation & Reliability**    | Scheduled jobs, logging, rerun safety, error handling.                                |  **In Progress**   | Safe idempotent batch inserts with `ingest.log`; unattended cron runner pending.                     |
| **5. Release & Handover**          | Deployment, containerization, setup documentation, CI/CD.                             |  **In Progress**   | Dockerized PostGIS DB; Next.js frontend containerization & cloud hosting pending.                    |
| **6. Extensions (Context)**        | Peatland overlays, smoke/air quality, satellite reflectance.                          | **Partially Done** | Peatland layer and NASA GIBS daily true-color imagery already implemented!                           |

### Minimum Viable Product (MVP) Checklist

- [x] **Interactive Kalimantan hotspot map** (MapLibre GL, FRP glow, local time popups, GIBS layer)
- [x] **Time slider and date filtering** (Play/pause scrubbing, 24h / 48h / 7d ranges)
- [x] **Weekly hotspot rankings by kabupaten** (Sorted by Count, FRP sum, Density, Peat share, Zoom-to-fit)
- [ ] **Historical FIRMS data stored in PostgreSQL** _(Database currently stores recent NRT data; multi-year archive backfill pending)_
- [ ] **Year-to-year comparisons with coverage caveats** _(Pending historical data backfill)_
- [ ] **Automated ingestion with duplicate handling** _(Deduplication is complete; unattended cron execution pending)_
- [ ] **Deployed application and setup documentation** _(Local setup complete; cloud deployment pending)_

**Current MVP Score: 3.5 of 7 Completed**

---

## Future Plans & Next Steps

1. **Phase 1 Completion — Historical Archive Backfill**:
   - Create a dedicated ingestion script for NASA FIRMS standard archive CSVs (MODIS / VIIRS) covering major fire years (e.g., the 2019 and 2023 El Niño seasons).
   - Normalize and partition historical tables to preserve query performance over millions of records.
2. **Phase 3 Completion — Year-to-Year Comparative Analysis**:
   - Build a comparison view in the UI: compare the current month/year against historical benchmarks (e.g., 2019 vs. 2023 vs. current year).
   - Add trend charts showing weekly hotspot trajectories and seasonality patterns.
3. **Phase 4 Completion — Automation & Scheduled Ingestion**:
   - Configure a recurring automated job (e.g., GitHub Actions workflow or a lightweight cron container) to execute `ingest:firms` every 6–12 hours.
   - Implement stale data detection and automated health checks.
4. **Phase 5 Completion — Production Deployment**:
   - Create a multi-stage `Dockerfile` for the Next.js application.
   - Deploy the web application and PostGIS database to a cloud environment (e.g., VPS / managed container service).
5. **Phase 6 Exploration — Environmental Context**:
   - Integrate ground air quality sensors (PM2.5 / ISPU) where available.
   - Explore smoke plume and wind direction vector overlays.

---

## Data Sources & Attributions

- **Thermal Detections**: [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) (Fire Information for Resource Management System) using the VIIRS 375m active fire products (Suomi NPP, NOAA-20, NOAA-21).
- **Satellite True-Color Imagery**: [NASA GIBS](https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs) (Global Imagery Browse Services).
- **Administrative Boundaries**: [Badan Informasi Geospasial (BIG)](https://tanahair.indonesia.go.id/).
- **Peatland Boundaries**: Kementerian Lingkungan Hidup dan Kehutanan (KLHK) Kesatuan Hidrologis Gambut (KHG).

_Disclaimer: Satellite thermal detections represent detected thermal anomalies, not field-verified ground fires. Fire Radiative Power (FRP) is an index of instantaneous energy output. Mapped peatland indicators designate overlap with estimated peat boundaries and do not constitute independent proof of deep peat combustion._
