import { NextResponse } from "next/server";
import { BidError, createBid, getBoardQuote } from "@/lib/bids";

export const runtime = "nodejs";

/** Current costs to claim #1 or run a takeover, before anyone commits sats. */
export async function GET() {
  const quote = await getBoardQuote();
  return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Reserve a bid and return a Lightning invoice. This does not touch the board —
 * only a settled payment claims a rank.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identity?: string;
      listingId?: string;
      title?: string;
      npub?: string;
      categorySlug?: string;
      bidSats?: number;
      kind?: "bid" | "takeover";
    };

    const kind = body.kind === "takeover" ? "takeover" : "bid";
    if (kind === "bid" && body.bidSats == null) {
      return NextResponse.json({ error: "bidSats is required" }, { status: 400 });
    }

    const result = await createBid({
      identity: body.identity,
      listingId: body.listingId,
      title: body.title,
      npub: body.npub,
      categorySlug: body.categorySlug,
      bidSats: Number(body.bidSats ?? 0),
      kind,
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof BidError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/bids", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create that bid." },
      { status: 500 },
    );
  }
}
