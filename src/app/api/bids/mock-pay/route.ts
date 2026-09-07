import { NextResponse } from "next/server";
import { settleInvoicePaid } from "@/lib/bids";
import { isMockMode } from "@/lib/ln";

export const runtime = "nodejs";

/**
 * Dev helper: mark a mock invoice paid.
 * Only available when LN_LSP_BASE_URL / LN_LSP_API_KEY are absent (mock mode).
 * Never exposed when live LSP is configured.
 */
export async function POST(request: Request) {
  if (!isMockMode()) {
    return NextResponse.json(
      { error: "mock-pay disabled when live LSP is configured" },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as { invoiceId?: string };
    const invoiceId = body.invoiceId?.trim();
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
    }

    const result = await settleInvoicePaid(invoiceId);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      mock: true,
      listingId: result.listingId,
      cumulativeSats: result.cumulativeSats,
    });
  } catch (err) {
    console.error("POST /api/bids/mock-pay", err);
    return NextResponse.json({ error: "mock-pay failed" }, { status: 500 });
  }
}
