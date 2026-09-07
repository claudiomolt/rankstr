import { NextResponse } from "next/server";
import { BidError, settleBid } from "@/lib/bids";

export const runtime = "nodejs";

/**
 * LUD21 verify check for one bid. The browser polls this while a wallet pays;
 * the verify URL itself never leaves the server. Settling here is what makes a
 * listing public.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bidId: string }> },
) {
  const { bidId } = await params;
  try {
    const result = await settleBid(bidId);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof BidError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/bids/[bidId]", err);
    return NextResponse.json({ error: "Could not check that payment." }, { status: 500 });
  }
}
