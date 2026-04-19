# Sea Pollution Map

Interactive map of bathing water quality across the UK, France, and Portugal.
Daily ingest from the [EEA Bathing Water Directive](https://water.europa.eu/freshwater/data-maps-and-tools/bathing-water-quality) dataset, rendered with Mapbox.

## Stack

- **Next.js 15** (App Router, TypeScript) — frontend + API routes on Vercel
- **Postgres on Railway** — stores beach locations + latest classification
- **Vercel Cron** — daily hit on `/api/ingest` to refresh data
- **Mapbox GL JS** — map rendering (Standard style, dusk preset)

## One-time setup

### 1. Postgres on Railway

1. Create a new Railway project, add the Postgres plugin.
2. From the Railway dashboard, open the Postgres service → **Connect** → copy the public `DATABASE_URL`.
3. Run the schema:

   ```bash
   psql "$DATABASE_URL" -f sql/001_init.sql
   ```

### 2. Mapbox token

Grab a public token from <https://account.mapbox.com/access-tokens/>. URL-restrict it to your deployed domain once you know it.

### 3. Env vars

Copy `.env.local.example` to `.env.local` and fill in:

- `DATABASE_URL` — from Railway
- `NEXT_PUBLIC_MAPBOX_TOKEN` — from Mapbox
- `CRON_SECRET` — any long random string (e.g. `openssl rand -hex 32`)

## Run locally

```bash
npm install
npm run dev
```

Then seed the database by hitting the ingest route:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/ingest
```

Open <http://localhost:3000> — markers should appear across the UK, France, and Portuguese coastlines.

## Deploy

1. Push to GitHub.
2. Import the repo on Vercel.
3. Add the same three env vars in the Vercel project settings.
4. Vercel reads `vercel.json` and schedules `/api/ingest` daily at 05:00 UTC.
5. Manually trigger the first ingest from Vercel's cron dashboard (or `curl` the deployed URL with the bearer token).

> Note: the ingest typically completes in ~10–30 s for ~6k beaches. If it ever exceeds 60 s you'll need Vercel Pro's extended `maxDuration`, or move the job to a Railway scheduled service.

## Data sources

- **[EEA Bathing Water Directive](https://water.discomap.eea.europa.eu/arcgis/rest/services/BathingWater/BathingWater_Dyna_WM/MapServer/0)** — annual classification (Excellent / Good / Sufficient / Poor) for every reported bathing water. This is the v1 source.

Potential additions later:

- **[data.gouv.fr — Qualité des eaux de baignade](https://www.data.gouv.fr/datasets/qualit-des-eaux-de-baignade)** — current-season samples for France, refreshed more often than the EEA annual roll-up.
- **[InfoÁgua](https://infoagua.apambiente.pt)** — Portugal's APA portal, per-beach weekly samples during bathing season.
- **[SAS Data HQ](https://datahq.sas.org.uk/)** — UK real-time sewage-discharge alerts (EDM data from water companies).

## Project layout

```
app/
  layout.tsx            # shell + mapbox-gl CSS
  page.tsx              # map page with legend overlay
  api/
    beaches/route.ts    # GET /api/beaches?bbox=w,s,e,n  → GeoJSON
    ingest/route.ts     # GET /api/ingest (cron)         → upserts from EEA
components/
  Map.tsx               # Mapbox map, viewport-driven queries, popup
lib/
  db.ts                 # postgres client (singleton)
  types.ts              # status normalization + colors
  ingest/eea.ts         # EEA ArcGIS pagination + bulk upsert
sql/
  001_init.sql          # beaches table + indexes
vercel.json             # daily cron
```
