/**
 * Lightning facade. One entry point for the rest of the app so callers never
 * branch on mock vs live themselves.
 *
 * Live path: LN_ADDRESS (LUD16) → .well-known/lnurlp → LUD06 callback → BOLT11,
 * settled via the LUD21 verify URL the callback returns.
 * Mock path: no LN_ADDRESS → labelled fake invoices, no spend.
 */

import {
  fetchPayParams,
  LnurlError,
  parseLightningAddress,
  requestInvoice,
  verifyInvoice,
  waitForSettlement,
} from "./lnurl";
import { isMockVerifyUrl, mockCreateInvoice, mockVerify } from "./mock";
import type { FetchLike, Invoice, InvoiceRequest, VerifyResult } from "./types";

export type { Invoice, InvoiceRequest, VerifyResult, VerifyState, LnurlPayParams, FetchLike } from "./types";
export { LnurlError, parseLightningAddress, lnurlpEndpoint, waitForSettlement } from "./lnurl";
export { mockSettle, mockFail, mockReset, isMockVerifyUrl } from "./mock";

const INVOICE_TTL_MS = 30 * 60 * 1000;

export function getLnAddress(): string | null {
  const value = process.env.LN_ADDRESS?.trim();
  return value ? value : null;
}

/** Mock mode is exactly "no LN_ADDRESS configured". */
export function isMockMode(): boolean {
  return getLnAddress() === null;
}

const defaultFetch: FetchLike = (input, init) =>
  fetch(input, { ...init, cache: "no-store" }) as unknown as ReturnType<FetchLike>;

export async function createInvoice(
  req: InvoiceRequest,
  fetchImpl: FetchLike = defaultFetch,
): Promise<Invoice> {
  if (!Number.isFinite(req.amountSats) || req.amountSats <= 0) {
    throw new LnurlError("amountSats must be a positive integer");
  }
  const amountSats = Math.floor(req.amountSats);

  const configured = getLnAddress();
  if (!configured) {
    return mockCreateInvoice({ ...req, amountSats });
  }

  const address = parseLightningAddress(configured);
  if (!address) {
    throw new LnurlError(`LN_ADDRESS "${configured}" is not a valid Lightning Address`);
  }

  const params = await fetchPayParams(address, fetchImpl);
  const invoice = await requestInvoice(params, amountSats, fetchImpl, req.memo);

  return {
    invoiceId: invoice.paymentRequest.slice(-48),
    paymentRequest: invoice.paymentRequest,
    verifyUrl: invoice.verifyUrl,
    amountSats,
    expiresAt: new Date(Date.now() + INVOICE_TTL_MS).toISOString(),
    mock: false,
  };
}

/** One LUD21 verify check. Mock verify URLs resolve against the in-process registry. */
export async function checkInvoice(
  verifyUrl: string | null,
  fetchImpl: FetchLike = defaultFetch,
): Promise<VerifyResult> {
  if (!verifyUrl) {
    return {
      state: "pending",
      reason: "This Lightning Address does not support LUD21 verify, so settlement cannot be confirmed automatically.",
    };
  }
  if (isMockVerifyUrl(verifyUrl)) return mockVerify(verifyUrl);
  return verifyInvoice(verifyUrl, fetchImpl);
}

/** Poll LUD21 verify until settled, failed, or timed out. */
export async function awaitSettlement(
  verifyUrl: string | null,
  options: Parameters<typeof waitForSettlement>[1] = {},
  fetchImpl: FetchLike = defaultFetch,
): Promise<VerifyResult> {
  return waitForSettlement(() => checkInvoice(verifyUrl, fetchImpl), options);
}
