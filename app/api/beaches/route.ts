import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type BeachRow = {
  source_id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  status: string;
  status_year: number | null;
  source_url: string | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bbox = url.searchParams.get("bbox");
  if (!bbox) {
    return NextResponse.json({ error: "bbox required" }, { status: 400 });
  }
  const parts = bbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return NextResponse.json({ error: "invalid bbox" }, { status: 400 });
  }
  const [west, south, east, north] = parts;

  const rows = await sql<BeachRow[]>`
    select source_id, name, country, lat, lng, status, status_year, source_url
    from beaches
    where lng between ${west} and ${east}
      and lat between ${south} and ${north}
    limit 5000
  `;

  const fc = {
    type: "FeatureCollection" as const,
    features: rows.map((r) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [Number(r.lng), Number(r.lat)],
      },
      properties: {
        id: r.source_id,
        name: r.name,
        country: r.country,
        status: r.status,
        year: r.status_year,
        sourceUrl: r.source_url,
      },
    })),
  };

  return NextResponse.json(fc, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
