import { randomBytes, createHash } from "crypto";
import type { Invoice, InvoiceRequest } from "./types";

/**
 * Thin Voltage-style / hosted LND REST adapter.
 *
 * Assumed live endpoints (placeholders matching typical Voltage node LND REST):
 *   POST {LN_LSP_BASE_URL}/v1/invoices
 *     Headers:
 *       Content-Type: application/json
 *       Grpc-Metadata-macaroon: {LN_LSP_API_KEY}   // hex macaroon OR API key
 *       (also sends Authorization: Bearer {LN_LSP_API_KEY} for managed gateways)
 *     Body: { value: <sats>, memo: string, expiry: seconds }
 *     Response (LND-shaped): { payment_request, r_hash (base64), add_index }
 *
 * When LN_LSP_BASE_URL or LN_LSP_API_KEY is absent → mock invoices only (no spend).
 */

const DEFAULT_EXPIRY_SEC = 60 * 30;

export function isMockMode(): boolean {
  const base = process.env.LN_LSP_BASE_URL?.trim();
  const key = process.env.LN_LSP_API_KEY?.trim();
  return !base || !key;
}

function networkPrefix(): "lnbc" | "lntb" {
  const net = (process.env.NEXT_PUBLIC_NETWORK ?? "mainnet").toLowerCase();
  return net === "testnet" || net === "regtest" ? "lntb" : "lnbc";
}

function mockCreateInvoice(req: InvoiceRequest): Invoice {
  const preimage = randomBytes(32);
  const paymentHash = createHash("sha256").update(preimage).digest("hex");
  const invoiceId = `mock_${paymentHash.slice(0, 24)}`;
  const prefix = networkPrefix();
  const paymentRequest = `${prefix}_mock_${req.amountSats}_${paymentHash.slice(0, 32)}`;
  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_SEC * 1000).toISOString();

  return {
    invoiceId,
    paymentRequest,
    paymentHash,
    amountSats: req.amountSats,
    expiresAt,
    mock: true,
  };
}

async function liveCreateInvoice(req: InvoiceRequest): Promise<Invoice> {
  const base = process.env.LN_LSP_BASE_URL!.replace(/\/$/, "");
  const apiKey = process.env.LN_LSP_API_KEY!;

  const res = await fetch(`${base}/v1/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Grpc-Metadata-macaroon": apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      value: req.amountSats,
      memo: req.memo,
      expiry: DEFAULT_EXPIRY_SEC,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LSP invoice failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    payment_request?: string;
    r_hash?: string;
    add_index?: string | number;
    id?: string;
  };

  const paymentRequest = data.payment_request;
  if (!paymentRequest) {
    throw new Error("LSP response missing payment_request");
  }

  // LND returns r_hash as base64; normalize to hex when possible.
  let paymentHash = "";
  if (data.r_hash) {
    try {
      paymentHash = Buffer.from(data.r_hash, "base64").toString("hex");
    } catch {
      paymentHash = data.r_hash;
    }
  }

  const invoiceId =
    data.id ??
    (data.add_index != null ? `lnd_${data.add_index}` : paymentHash || `inv_${Date.now()}`);

  return {
    invoiceId: String(invoiceId),
    paymentRequest,
    paymentHash,
    amountSats: req.amountSats,
    expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_SEC * 1000).toISOString(),
    mock: false,
  };
}

export async function createInvoice(req: InvoiceRequest): Promise<Invoice> {
  if (!Number.isFinite(req.amountSats) || req.amountSats <= 0) {
    throw new Error("amountSats must be a positive integer");
  }
  const amountSats = Math.floor(req.amountSats);

  if (isMockMode()) {
    return mockCreateInvoice({ ...req, amountSats });
  }
  return liveCreateInvoice({ ...req, amountSats });
}

export type LspAdapter = {
  createInvoice: typeof createInvoice;
  isMockMode: typeof isMockMode;
};

export function getLsp(): LspAdapter {
  return { createInvoice, isMockMode };
}
