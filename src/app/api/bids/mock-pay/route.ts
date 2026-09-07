import { NextResponse } from "next/server";
import { BidError, settleBid } from "@/lib/bids";
import { isMockMode, mockSettle } from "@/lib/ln";

export const runtime = "nodejs";

/**
 * Dev-only settle for the mock rail. Available only when LN_ADDRESS is unset,
 * so a configured board can never be advanced without a real payment.
 */
export async function POST(request: Request) {
  if (!isMockMode()) {
    return NextResponse.json(
      { error: "Mock pay is disabled: LN_ADDRESS is configured." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as { bidId?: string; mockInvoiceId?: string };
    const bidId = body.bidId?.trim();
    const mockInvoiceId = body.mockInvoiceId?.trim();
    if (!bidId || !mockInvoiceId) {
      return NextResponse.json({ error: "bidId and mockInvoiceId are required" }, { status: 400 });
    }

    if (!mockSettle(mockInvoiceId)) {
      return NextResponse.json(
        { error: "That mock invoice is unknown or already resolved." },
        { status: 409 },
      );
    }

    const result = await settleBid(bidId);
    return NextResponse.json({ ...result, mock: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof BidError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/bids/mock-pay", err);
    return NextResponse.json({ error: "Mock pay failed." }, { status: 500 });
  }
}
