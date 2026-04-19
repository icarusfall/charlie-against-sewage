import { NextResponse } from "next/server";
import { ingestEEA } from "@/lib/ingest/eea";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const result = await ingestEEA();
    return NextResponse.json({
      ok: true,
      ...result,
      tookMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, tookMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
