import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const MAX_LIMIT = 25;

/** Settled bids, newest first. Real payments only — nothing here is projected. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(1, Math.floor(requested)), MAX_LIMIT) : 10;

  try {
    const entries = await getStore().recentActivity(limit);
    return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/activity", err);
    return NextResponse.json({ entries: [] }, { status: 200 });
  }
}
