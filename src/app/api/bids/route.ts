import { NextResponse } from "next/server";
import { BidError, createBid } from "@/lib/bids";
import { isMockMode } from "@/lib/ln";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      listingId?: string;
      title?: string;
      url?: string;
      npub?: string;
      targetCumulativeSats?: number;
    };

    if (body.targetCumulativeSats == null) {
      return NextResponse.json(
        { error: "targetCumulativeSats is required" },
        { status: 400 },
      );
    }

    const result = await createBid({
      listingId: body.listingId,
      title: body.title,
      url: body.url,
      npub: body.npub,
      targetCumulativeSats: body.targetCumulativeSats,
    });

    return NextResponse.json({
      ...result,
      mockMode: isMockMode(),
    });
  } catch (err) {
    if (err instanceof BidError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/bids", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "bid failed" },
      { status: 500 },
    );
  }
}
