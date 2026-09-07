"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MIN_BID_SATS, raiseDeltaSats, type Listing } from "@/lib/rankings";
import { formatSats } from "@/lib/utils";
import { truncateNpub } from "@/lib/nostr";
import { createElement } from "react";

type Mode = "create" | "raise";

type InvoicePayload = {
  bidId: string;
  listingId: string;
  amountSats: number;
  targetCumulativeSats: number;
  mockMode: boolean;
  invoice: {
    invoiceId: string;
    paymentRequest: string;
    paymentHash: string;
    expiresAt: string;
    mock: boolean;
  };
};

function Msg(props: { className: string; text: string }) {
  return createElement("p", { className: props.className }, props.text);
}

function listingOptionLabel(l: Listing): string {
  const base = l.title + " — " + formatSats(l.cumulativeSats);
  if (l.npub?.trim()) {
    return base + " · " + truncateNpub(l.npub.trim());
  }
  return base;
}

export function BidForm({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [npub, setNpub] = useState("");
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [target, setTarget] = useState(String(MIN_BID_SATS));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoicePayload | null>(null);
  const [paidNote, setPaidNote] = useState<string | null>(null);

  const selected = useMemo(
    () => listings.find((l) => l.id === listingId),
    [listings, listingId],
  );

  const previewDelta = useMemo(() => {
    const t = Math.floor(Number(target));
    if (!Number.isFinite(t)) return null;
    if (mode === "create") return raiseDeltaSats(0, t);
    return raiseDeltaSats(selected?.cumulativeSats ?? 0, t);
  }, [mode, target, selected]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPaidNote(null);
    setInvoice(null);
    setBusy(true);
    try {
      const targetCumulativeSats = Math.floor(Number(target));
      const body =
        mode === "create"
          ? { title, url: url || undefined, npub: npub || undefined, targetCumulativeSats }
          : { listingId, targetCumulativeSats };
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bid failed");
      setInvoice(data as InvoicePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bid failed");
    } finally {
      setBusy(false);
    }
  }

  async function onMockPay() {
    if (!invoice) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bids/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.invoice.invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mock pay failed");
      setPaidNote("Paid (mock). Listing now " + formatSats(data.cumulativeSats) + ".");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mock pay failed");
    } finally {
      setBusy(false);
    }
  }

  const raiseHint =
    mode === "raise" && selected ? "; current " + selected.cumulativeSats : "";
  const createClass =
    "rounded-none border px-3 py-1.5 text-xs font-mono uppercase " +
    (mode === "create" ? "border-primary text-primary" : "border-border text-muted-foreground");
  const raiseClass =
    "rounded-none border px-3 py-1.5 text-xs font-mono uppercase " +
    (mode === "raise" ? "border-primary text-primary" : "border-border text-muted-foreground");

  return (
    <section
      className="border border-border bg-card p-4"
      style={{ borderLeft: "3px solid hsl(var(--primary))" }}
    >
      <h2 className="font-display text-lg font-semibold lowercase">climb rank</h2>
      <Msg
        className="mt-1 text-sm text-muted-foreground"
        text={
          "Pay sats over Lightning to create or raise a listing. Min bid " +
          MIN_BID_SATS +
          " sats. Bitcoin-only."
        }
      />

      <div className="mt-4 flex gap-2">
        <button type="button" className={createClass} onClick={() => setMode("create")}>
          create
        </button>
        <button type="button" className={raiseClass} onClick={() => setMode("raise")}>
          raise
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        {mode === "create" ? (
          <>
            <label className="block text-xs text-muted-foreground">
              title
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              url (optional if npub)
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              npub (optional if url)
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                value={npub}
                onChange={(e) => setNpub(e.target.value)}
                placeholder="npub1..."
              />
            </label>
          </>
        ) : (
          <label className="block text-xs text-muted-foreground">
            listing
            <select
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              required
            >
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {listingOptionLabel(l)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-xs text-muted-foreground">
          {"target cumulative sats (≥ " + MIN_BID_SATS + raiseHint + ")"}
          <input
            type="number"
            min={MIN_BID_SATS}
            className="mt-1 w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </label>

        <Msg
          className="font-mono text-xs text-[color:var(--rs-frost)]"
          text={"invoice amount: " + (previewDelta == null ? "invalid target" : formatSats(previewDelta))}
        />

        {error ? <Msg className="text-sm text-destructive" text={error} /> : null}
        {paidNote ? <Msg className="text-sm text-[color:var(--rs-brass)]" text={paidNote} /> : null}

        <button
          type="submit"
          disabled={busy || previewDelta == null}
          className="rounded-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "working…" : "pay & climb"}
        </button>
      </form>

      {invoice ? (
        <div className="mt-4 space-y-2 border border-border bg-background p-3">
          <Msg
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--rs-frost)]"
            text={"lightning invoice " + (invoice.invoice.mock ? "(mock)" : "(live)")}
          />
          <Msg className="break-all font-mono text-xs text-foreground" text={invoice.invoice.paymentRequest} />
          <Msg
            className="font-mono text-xs text-muted-foreground"
            text={"pay " + formatSats(invoice.amountSats) + " · expires " + invoice.invoice.expiresAt}
          />
          {invoice.mockMode || invoice.invoice.mock ? (
            <button
              type="button"
              disabled={busy}
              onClick={onMockPay}
              className="rounded-none border border-primary px-3 py-1.5 text-xs font-mono uppercase text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
            >
              mock pay (dev)
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
