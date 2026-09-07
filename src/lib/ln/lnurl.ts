/**
 * LUD16 Lightning Address → LUD06 LNURL-pay invoice → LUD21 verify.
 *
 * The whole payment path runs server-side. The browser never sees a key, a
 * callback secret, or the verify URL; it only ever polls our own bid status
 * endpoint. There is no fiat rail and no client-held secret anywhere here.
 */

import type { FetchLike, LnurlPayParams, VerifyResult } from "./types";

export class LnurlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LnurlError";
  }
}

export type LightningAddress = { name: string; domain: string };

const NAME_RE = /^[a-z0-9-_.]+$/i;

/** Split `name@domain` per LUD16. Returns null when the input is not an address. */
export function parseLightningAddress(address: string): LightningAddress | null {
  const raw = address?.trim().toLowerCase();
  if (!raw || raw.includes(" ")) return null;
  const parts = raw.split("@");
  if (parts.length !== 2) return null;
  const [name, domain] = parts;
  if (!name || !domain || !NAME_RE.test(name)) return null;
  if (!domain.includes(".") && !domain.endsWith(".onion")) return null;
  return { name, domain };
}

/** LUD16 well-known endpoint. Clearnet is https; .onion is http per the spec. */
export function lnurlpEndpoint(address: LightningAddress): string {
  const scheme = address.domain.endsWith(".onion") ? "http" : "https";
  return `${scheme}://${address.domain}/.well-known/lnurlp/${address.name}`;
}

function assertNotLnurlError(payload: unknown): void {
  const obj = payload as { status?: string; reason?: string } | null;
  if (obj && typeof obj === "object" && String(obj.status).toUpperCase() === "ERROR") {
    throw new LnurlError(obj.reason || "LNURL endpoint returned an error");
  }
}

async function getJson(url: string, fetchImpl: FetchLike): Promise<unknown> {
  let res;
  try {
    res = await fetchImpl(url, { method: "GET", headers: { Accept: "application/json" } });
  } catch (err) {
    throw new LnurlError(`Request to ${url} failed: ${err instanceof Error ? err.message : "network error"}`);
  }
  if (!res.ok) {
    throw new LnurlError(`Request to ${url} failed with HTTP ${res.status}`);
  }
  try {
    return await res.json();
  } catch {
    throw new LnurlError(`Response from ${url} was not JSON`);
  }
}

/** LUD06 step 1: fetch the payRequest parameters. */
export async function fetchPayParams(
  address: LightningAddress,
  fetchImpl: FetchLike,
): Promise<LnurlPayParams> {
  const payload = await getJson(lnurlpEndpoint(address), fetchImpl);
  assertNotLnurlError(payload);

  const params = payload as Partial<LnurlPayParams>;
  if (params.tag !== "payRequest") {
    throw new LnurlError(`${address.name}@${address.domain} is not an LNURL-pay endpoint`);
  }
  if (typeof params.callback !== "string" || !params.callback) {
    throw new LnurlError("LNURL-pay response is missing a callback URL");
  }
  const minSendable = Number(params.minSendable);
  const maxSendable = Number(params.maxSendable);
  if (!Number.isFinite(minSendable) || !Number.isFinite(maxSendable)) {
    throw new LnurlError("LNURL-pay response is missing sendable bounds");
  }

  return {
    callback: params.callback,
    minSendable,
    maxSendable,
    metadata: typeof params.metadata === "string" ? params.metadata : "",
    tag: "payRequest",
    commentAllowed: typeof params.commentAllowed === "number" ? params.commentAllowed : undefined,
  };
}

export type CallbackInvoice = {
  paymentRequest: string;
  /** LUD21. Absent when the service does not support verify. */
  verifyUrl: string | null;
};

function withQuery(callback: string, query: Record<string, string>): string {
  const url = new URL(callback);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/** LUD06 step 2: call the callback for a BOLT11, picking up the LUD21 verify URL. */
export async function requestInvoice(
  params: LnurlPayParams,
  amountSats: number,
  fetchImpl: FetchLike,
  comment?: string,
): Promise<CallbackInvoice> {
  const amountMsats = Math.round(amountSats * 1000);
  if (amountMsats < params.minSendable || amountMsats > params.maxSendable) {
    throw new LnurlError(
      `${amountSats} sats is outside what this Lightning Address accepts ` +
        `(${Math.ceil(params.minSendable / 1000)}–${Math.floor(params.maxSendable / 1000)} sats)`,
    );
  }

  const query: Record<string, string> = { amount: String(amountMsats) };
  if (comment && params.commentAllowed && params.commentAllowed > 0) {
    query.comment = comment.slice(0, params.commentAllowed);
  }

  const payload = await getJson(withQuery(params.callback, query), fetchImpl);
  assertNotLnurlError(payload);

  const data = payload as { pr?: string; verify?: string };
  if (typeof data.pr !== "string" || !data.pr) {
    throw new LnurlError("LNURL-pay callback did not return an invoice");
  }

  return {
    paymentRequest: data.pr,
    verifyUrl: typeof data.verify === "string" && data.verify ? data.verify : null,
  };
}

/**
 * LUD21 verify: one check against the verify URL.
 *
 * `settled: true` claims the rank. An LNURL `status: "ERROR"` is terminal.
 * Transport failures stay `pending` so a blip does not fail a real payment.
 */
export async function verifyInvoice(verifyUrl: string, fetchImpl: FetchLike): Promise<VerifyResult> {
  let payload: unknown;
  try {
    payload = await getJson(verifyUrl, fetchImpl);
  } catch (err) {
    if (err instanceof LnurlError && /HTTP 4/.test(err.message)) {
      return { state: "failed", reason: err.message };
    }
    return { state: "pending", reason: err instanceof Error ? err.message : "verify unavailable" };
  }

  const data = payload as { status?: string; settled?: boolean; preimage?: string | null; reason?: string };
  if (String(data?.status).toUpperCase() === "ERROR") {
    return { state: "failed", reason: data?.reason || "verify returned an error" };
  }
  if (data?.settled === true) {
    return { state: "settled", preimage: data.preimage ?? undefined };
  }
  return { state: "pending" };
}

export type WaitOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_INTERVAL_MS = 2_000;

/**
 * Poll LUD21 verify until the invoice settles, fails, or the window closes.
 * Clock and sleep are injectable so tests do not wait on real time.
 */
export async function waitForSettlement(
  check: () => Promise<VerifyResult>,
  options: WaitOptions = {},
): Promise<VerifyResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const deadline = now() + timeoutMs;
  let last: VerifyResult = { state: "pending" };

  for (;;) {
    last = await check();
    if (last.state === "settled" || last.state === "failed") return last;
    if (now() + intervalMs > deadline) {
      return { state: "pending", reason: "verify timed out; the invoice may still settle" };
    }
    await sleep(intervalMs);
  }
}
