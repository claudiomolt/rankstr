"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";
import { MIN_BID_SATS } from "@/lib/rankings";
import { formatSats } from "@/lib/utils";

export type BoardQuote = {
  topBidSats: number;
  claimTopSats: number;
  takeoverCostSats: number;
  takeoverAvailable: boolean;
  takeoverActiveUntil?: string;
  minBidSats: number;
  mock: boolean;
};

type Mode = "bid" | "takeover";

type Reservation = {
  bidId: string;
  listingId: string;
  kind: Mode;
  amountSats: number;
  bidSats: number;
  projectedRank: number;
  invoice: { paymentRequest: string; expiresAt: string; mock: boolean };
  mockInvoiceId?: string;
};

type Settlement = { state: "settled" | "pending" | "failed"; cumulativeSats: number; reason?: string };

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const inputClass =
  "mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground";
const monoInputClass = inputClass + " font-mono";

function tabClass(active: boolean): string {
  return (
    "rounded-none border px-3 py-1.5 font-mono text-xs uppercase " +
    (active ? "border-primary text-primary" : "border-border text-muted-foreground")
  );
}

export function BidForm({ quote, defaultCategory }: { quote: BoardQuote; defaultCategory?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("bid");
  const [identity, setIdentity] = useState("");
  const [title, setTitle] = useState("");
  const [npub, setNpub] = useState("");
  const [categorySlug, setCategorySlug] = useState(defaultCategory ?? DEFAULT_CATEGORY);
  const [bidSats, setBidSats] = useState(String(quote.claimTopSats));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [copied, setCopied] = useState(false);

  const startedAt = useRef<number>(0);

  const poll = useCallback(
    async (bidId: string): Promise<Settlement | null> => {
      const res = await fetch(`/api/bids/${bidId}`, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as Settlement;
    },
    [],
  );

  // Poll LUD21 verify through our own endpoint until the invoice settles, fails,
  // or the window closes. The verify URL stays server-side.
  useEffect(() => {
    if (!reservation || settlement?.state === "settled" || settlement?.state === "failed") return;

    let cancelled = false;
    startedAt.current = startedAt.current || Date.now();

    const timer = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        clearInterval(timer);
        setSettlement({
          state: "pending",
          cumulativeSats: 0,
          reason: "Still waiting on this invoice. It may still settle.",
        });
        return;
      }
      const next = await poll(reservation.bidId);
      if (cancelled || !next) return;
      setSettlement(next);
      if (next.state === "settled") {
        clearInterval(timer);
        router.refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reservation, settlement?.state, poll, router]);

  function reset() {
    setError(null);
    setSettlement(null);
    setReservation(null);
    setCopied(false);
    startedAt.current = 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    reset();
    setBusy(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity,
          title: title || undefined,
          npub: npub || undefined,
          categorySlug,
          bidSats: mode === "bid" ? Math.floor(Number(bidSats)) : undefined,
          kind: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create that bid.");
      setReservation(data as Reservation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that bid.");
    } finally {
      setBusy(false);
    }
  }

  async function onMockPay() {
    if (!reservation?.mockInvoiceId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bids/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidId: reservation.bidId,
          mockInvoiceId: reservation.mockInvoiceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mock pay failed.");
      setSettlement(data as Settlement);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mock pay failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!reservation) return;
    try {
      await navigator.clipboard.writeText(reservation.invoice.paymentRequest);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      className="border border-border bg-card p-4"
      style={{ borderLeft: "3px solid hsl(var(--primary))" }}
    >
      <h2 className="font-display text-lg font-semibold lowercase">claim a rank</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pay sats over Lightning. Rank is the bid — nothing else. Minimum {MIN_BID_SATS} sats, whole
        sats only. Submit a website or @handle that is already on the board to raise it; you only pay
        the difference.
      </p>

      <div className="mt-4 flex gap-2">
        <button type="button" className={tabClass(mode === "bid")} onClick={() => setMode("bid")}>
          bid
        </button>
        <button
          type="button"
          className={tabClass(mode === "takeover")}
          onClick={() => setMode("takeover")}
        >
          takeover
        </button>
      </div>

      {mode === "takeover" ? (
        <p className="mt-3 border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
          {quote.takeoverAvailable
            ? `Takeover costs ${formatSats(quote.takeoverCostSats)} — 2× the current #1 — and locks the first page for 3 hours.`
            : `A takeover is already live${
                quote.takeoverActiveUntil
                  ? ` until ${new Date(quote.takeoverActiveUntil).toLocaleTimeString()}`
                  : ""
              }. Only one takeover can be live at a time.`}
        </p>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label className="block text-xs text-muted-foreground">
          website, @handle, or npub
          <input
            className={monoInputClass}
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="https://example.com · @handle · npub1…"
            required
          />
        </label>

        <label className="block text-xs text-muted-foreground">
          title (optional)
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-muted-foreground">
            category
            <select
              className={inputClass}
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-muted-foreground">
            npub (optional, adds a Nostr profile)
            <input
              className={monoInputClass}
              value={npub}
              onChange={(e) => setNpub(e.target.value)}
              placeholder="npub1…"
            />
          </label>
        </div>

        {mode === "bid" ? (
          <div>
            <label className="block text-xs text-muted-foreground">
              bid in sats
              <input
                type="number"
                min={MIN_BID_SATS}
                step={1}
                className={monoInputClass}
                value={bidSats}
                onChange={(e) => setBidSats(e.target.value)}
                required
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-none border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground"
                onClick={() => setBidSats(String(quote.claimTopSats))}
              >
                claim #1 · {formatSats(quote.claimTopSats)}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                current #1 {formatSats(quote.topBidSats)}
              </span>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "working…" : mode === "takeover" ? "take over the board" : "get invoice"}
        </button>
      </form>

      {reservation ? (
        <div className="mt-4 space-y-2 border border-border bg-background p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--rs-frost)]">
            lightning invoice {reservation.invoice.mock ? "(mock — no sats move)" : ""}
          </p>
          <p className="break-all font-mono text-xs text-foreground">
            {reservation.invoice.paymentRequest}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            pay {formatSats(reservation.amountSats)} · would land at #{reservation.projectedRank}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-none border border-border px-3 py-1.5 font-mono text-xs uppercase text-muted-foreground hover:text-foreground"
            >
              {copied ? "copied" : "copy invoice"}
            </button>
            {reservation.mockInvoiceId ? (
              <button
                type="button"
                disabled={busy}
                onClick={onMockPay}
                className="rounded-none border border-primary px-3 py-1.5 font-mono text-xs uppercase text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
              >
                mock pay (dev)
              </button>
            ) : null}
          </div>

          <p className="font-mono text-xs text-muted-foreground">
            {settlement?.state === "settled"
              ? `settled — listing now ${formatSats(settlement.cumulativeSats)}`
              : settlement?.state === "failed"
                ? `payment failed — ${settlement.reason ?? "not settled"}`
                : (settlement?.reason ?? "waiting for payment…")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
