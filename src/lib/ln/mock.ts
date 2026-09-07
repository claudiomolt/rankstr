/**
 * Mock Lightning rail, used only when LN_ADDRESS is unset.
 *
 * Nothing here touches a node or moves value. Mock invoices carry an obvious
 * `_mock_` marker in the payment request and every surface that renders one
 * labels it, so a mock board can never be mistaken for a settled one.
 */

import { createHash, randomBytes } from "crypto";
import { globalSingleton, resetGlobalSingleton } from "@/lib/global-singleton";
import type { Invoice, InvoiceRequest, VerifyResult } from "./types";

export const MOCK_VERIFY_SCHEME = "mock://verify/";
const EXPIRY_MS = 30 * 60 * 1000;
const REGISTRY_KEY = "mock-invoices";

type MockState = "pending" | "settled" | "failed";

/**
 * Process-local, and shared across route bundles so the route that reserves an
 * invoice and the route that settles it see the same registry. Mock mode is a
 * dev affordance, not a persistence story.
 */
function mockInvoices(): Map<string, MockState> {
  return globalSingleton(REGISTRY_KEY, () => new Map<string, MockState>());
}

function networkPrefix(): "lnbc" | "lntb" {
  const net = (process.env.NEXT_PUBLIC_NETWORK ?? "mainnet").toLowerCase();
  return net === "testnet" || net === "regtest" ? "lntb" : "lnbc";
}

export function mockCreateInvoice(req: InvoiceRequest): Invoice {
  const paymentHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const invoiceId = `mock_${paymentHash.slice(0, 24)}`;
  mockInvoices().set(invoiceId, "pending");

  return {
    invoiceId,
    paymentRequest: `${networkPrefix()}_mock_${req.amountSats}_${paymentHash.slice(0, 32)}`,
    verifyUrl: `${MOCK_VERIFY_SCHEME}${invoiceId}`,
    amountSats: req.amountSats,
    expiresAt: new Date(Date.now() + EXPIRY_MS).toISOString(),
    mock: true,
  };
}

export function isMockVerifyUrl(verifyUrl: string | null | undefined): boolean {
  return Boolean(verifyUrl?.startsWith(MOCK_VERIFY_SCHEME));
}

function invoiceIdFromVerifyUrl(verifyUrl: string): string {
  return verifyUrl.slice(MOCK_VERIFY_SCHEME.length);
}

export function mockVerify(verifyUrl: string): VerifyResult {
  const state = mockInvoices().get(invoiceIdFromVerifyUrl(verifyUrl));
  if (state === "settled") return { state: "settled", preimage: "mock", mock: true };
  if (state === "failed") return { state: "failed", reason: "mock invoice failed", mock: true };
  if (!state) return { state: "failed", reason: "unknown mock invoice", mock: true };
  return { state: "pending", mock: true };
}

/** Dev-only settle. Returns false when the invoice is unknown or already resolved. */
export function mockSettle(invoiceId: string): boolean {
  const registry = mockInvoices();
  if (registry.get(invoiceId) !== "pending") return false;
  registry.set(invoiceId, "settled");
  return true;
}

export function mockFail(invoiceId: string): boolean {
  const registry = mockInvoices();
  if (registry.get(invoiceId) !== "pending") return false;
  registry.set(invoiceId, "failed");
  return true;
}

export function mockReset(): void {
  resetGlobalSingleton(REGISTRY_KEY);
}
