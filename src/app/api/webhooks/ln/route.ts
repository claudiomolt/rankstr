import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { settleInvoicePaid } from "@/lib/bids";
import { isMockMode } from "@/lib/ln";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function extractSecret(request: Request): string | null {
  const header =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-ln-webhook-secret");
  if (header) return header;
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      invoiceId?: string;
      payment_hash?: string;
      status?: string;
      settled?: boolean;
    };

    const invoiceId = body.invoiceId?.trim();
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
    }

    const status = (body.status ?? (body.settled ? "paid" : "")).toLowerCase();
    const mock = isMockMode();
    const expectedSecret = process.env.LN_WEBHOOK_SECRET?.trim();

    if (expectedSecret) {
      const provided = extractSecret(request);
      if (!provided || !safeEqual(provided, expectedSecret)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    } else if (!mock) {
      return NextResponse.json(
        { error: "LN_WEBHOOK_SECRET required when live LSP is configured" },
        { status: 401 },
      );
    }

    if (status !== "paid" && status !== "settled") {
      return NextResponse.json({ ok: true, ignored: true, status });
    }

    const result = await settleInvoicePaid(invoiceId);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      listingId: result.listingId,
      cumulativeSats: result.cumulativeSats,
    });
  } catch (err) {
    console.error("POST /api/webhooks/ln", err);
    return NextResponse.json({ error: "webhook failed" }, { status: 500 });
  }
}
