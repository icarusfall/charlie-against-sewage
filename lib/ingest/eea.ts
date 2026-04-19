import { sql } from "@/lib/db";
import { normalizeStatus } from "@/lib/types";

const EEA_QUERY_URL =
  "https://water.discomap.eea.europa.eu/arcgis/rest/services/BathingWater/BathingWater_Dyna_WM/MapServer/0/query";

const COUNTRIES = ["GB", "UK", "FR", "PT"];

type EEAFeature = {
  geometry: { x: number; y: number } | null;
  attributes: Record<string, unknown>;
};

type EEAResponse = {
  features?: EEAFeature[];
  exceededTransferLimit?: boolean;
};

async function fetchBatch(offset: number, pageSize: number): Promise<EEAResponse> {
  const countryList = COUNTRIES.map((c) => `'${c}'`).join(",");
  const params = new URLSearchParams({
    where: `countryCode IN (${countryList})`,
    outFields: "*",
    outSR: "4326",
    returnGeometry: "true",
    f: "json",
    resultOffset: String(offset),
    resultRecordCount: String(pageSize),
  });
  const res = await fetch(`${EEA_QUERY_URL}?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`EEA request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as EEAResponse;
}

type BeachRow = {
  source: string;
  source_id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  status: string;
  status_year: number | null;
  source_url: string | null;
};

function toRow(f: EEAFeature): BeachRow | null {
  const a = f.attributes;
  const lng = f.geometry?.x;
  const lat = f.geometry?.y;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const sourceId =
    (a.bathingWaterIdentifier as string | undefined) ??
    (a.OBJECTID != null ? String(a.OBJECTID) : null);
  if (!sourceId) return null;

  return {
    source: "eea",
    source_id: sourceId,
    name: (a.bathingWaterName as string | undefined) ?? "Unnamed",
    country: (a.countryCode as string | undefined) ?? "",
    lat,
    lng,
    status: normalizeStatus(a.qualityStatus as string | undefined),
    status_year: null,
    source_url: (a.bathingWaterUrl as string | undefined) ?? null,
  };
}

export async function ingestEEA() {
  const pageSize = 1000;
  let offset = 0;
  let inserted = 0;

  while (true) {
    const { features = [], exceededTransferLimit } = await fetchBatch(
      offset,
      pageSize,
    );
    if (features.length === 0) break;

    const rows = features
      .map(toRow)
      .filter((r): r is BeachRow => r !== null);

    if (rows.length > 0) {
      await sql`
        insert into beaches ${sql(
          rows,
          "source",
          "source_id",
          "name",
          "country",
          "lat",
          "lng",
          "status",
          "status_year",
          "source_url",
        )}
        on conflict (source, source_id) do update set
          name = excluded.name,
          country = excluded.country,
          lat = excluded.lat,
          lng = excluded.lng,
          status = excluded.status,
          source_url = excluded.source_url,
          updated_at = now()
      `;
      inserted += rows.length;
    }

    offset += features.length;
    if (!exceededTransferLimit && features.length < pageSize) break;
    if (offset > 50_000) break; // safety cap
  }

  return { inserted };
}
