"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, Globe, Loader2, Minus, Plus, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";
import { BID_STEP_SATS, MIN_BID_SATS, type BoardWindow } from "@/lib/rankings";
import { cn, formatSatsShort } from "@/lib/utils";

type Reservation = {
  bidId: string;
  listingId: string;
  amountSats: number;
  bidSats: number;
  projectedRank: number;
  invoice: { paymentRequest: string; expiresAt: string; mock: boolean };
  mockInvoiceId?: string;
};

type Settlement = {
  state: "settled" | "pending" | "failed";
  cumulativeSats: number;
  reason?: string;
};

type Stage = "form" | "confirm" | "pay" | "done";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export type ClaimPanelProps = {
  window: BoardWindow;
  /** Smallest amount that claims #1 on the board being viewed. */
  claimTopSats: number;
  categorySlug: string | null;
  categoryLabel: string | null;
  mock: boolean;
};

/**
 * The whole claim flow: headline price stepper, one-line form, a confirmation
 * step, then the Lightning invoice and its post-pay state.
 *
 * Nothing here moves the board on its own — the rank is claimed by the settled
 * payment, which the server confirms through LUD21 verify.
 */
export function ClaimPanel({
  window: boardWindow,
  claimTopSats,
  categorySlug,
  categoryLabel,
  mock,
}: ClaimPanelProps) {
  const router = useRouter();
  const amountFieldId = useId();
  const termsId = useId();

  const [stage, setStage] = useState<Stage>("form");
  const [sats, setSats] = useState(claimTopSats);
  const [identity, setIdentity] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categorySlug ?? DEFAULT_CATEGORY);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [copied, setCopied] = useState(false);

  const startedAt = useRef(0);

  useEffect(() => setSats(claimTopSats), [claimTopSats]);

  const poll = useCallback(async (bidId: string): Promise<Settlement | null> => {
    const res = await fetch(`/api/bids/${bidId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Settlement;
  }, []);

  // Poll LUD21 verify through our own endpoint until the invoice settles, fails,
  // or the window closes. The verify URL stays server-side.
  useEffect(() => {
    if (stage !== "pay" || !reservation) return;

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
        setStage("done");
        router.refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [stage, reservation, poll, router]);

  function bump(delta: number) {
    setSats((current) => Math.max(MIN_BID_SATS, current + delta));
  }

  function openConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!identity.trim()) {
      setError("Enter a website, an X @handle, or an npub.");
      return;
    }
    setAgreed(false);
    setStage("confirm");
  }

  async function reserve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity,
          title: title || undefined,
          description: description || undefined,
          categorySlug: category,
          bidSats: Math.floor(sats),
          kind: "bid",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reserve that rank.");
      setReservation(data as Reservation);
      setSettlement(null);
      startedAt.current = 0;
      setStage("pay");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reserve that rank.");
    } finally {
      setBusy(false);
    }
  }

  async function mockPay() {
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
      setStage("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mock pay failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvoice() {
    if (!reservation) return;
    try {
      await navigator.clipboard.writeText(reservation.invoice.paymentRequest);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function startOver() {
    setStage("form");
    setReservation(null);
    setSettlement(null);
    setIdentity("");
    setTitle("");
    setDescription("");
    setError(null);
    startedAt.current = 0;
  }

  const headline =
    boardWindow === "today"
      ? "Claim today’s #1 for"
      : categoryLabel
        ? `Claim #1 in ${categoryLabel} for`
        : "Claim #1 for";

  if (stage === "done" && settlement?.state === "settled") {
    return (
      <section id="claim" className="scroll-mt-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-primary/40 bg-primary/[0.06] px-5 py-6 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Zap className="size-3.5" strokeWidth={2} aria-hidden />
            Payment settled
          </p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] md:text-[32px]">
            You are on the board at{" "}
            <span className="text-primary">{formatSatsShort(settlement.cumulativeSats)} sats</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The listing is public now. Clicks go to the URL or profile you submitted, without query
            parameters.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => router.refresh()}>
              See the board
            </Button>
            <Button type="button" variant="outline" onClick={startOver}>
              Claim another rank
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="claim" className="scroll-mt-6">
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={busy}>
        <h2 className="mx-auto max-w-4xl text-center text-[28px] font-semibold tracking-[-0.03em] text-pretty md:text-[40px]">
          <span>{headline}</span>{" "}
          <span className="inline-flex items-center gap-2 align-middle whitespace-nowrap">
            <Button
              type="button"
              variant="soft"
              size="bump"
              aria-label={`Lower by ${BID_STEP_SATS} sat`}
              onClick={() => bump(-BID_STEP_SATS)}
            >
              <Minus strokeWidth={2.5} />
            </Button>
            <label
              htmlFor={amountFieldId}
              className="inline-flex items-baseline gap-1.5 text-primary underline decoration-2 decoration-dashed underline-offset-[6px]"
            >
              <span className="sr-only">Amount in sats</span>
              {/* The invisible copy sizes the box to the digits so the field never jumps. */}
              <span className="relative inline-block tabular-nums">
                <span aria-hidden className="invisible whitespace-nowrap">
                  {sats}
                </span>
                <input
                  id={amountFieldId}
                  type="number"
                  min={MIN_BID_SATS}
                  step={BID_STEP_SATS}
                  value={sats}
                  onChange={(e) => setSats(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  onBlur={() => setSats((v) => Math.max(MIN_BID_SATS, v))}
                  className="absolute inset-0 w-full bg-transparent text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </span>
              <span className="text-[0.55em] font-semibold">sats</span>
            </label>
            <Button
              type="button"
              variant="soft"
              size="bump"
              aria-label={`Raise by ${BID_STEP_SATS} sat`}
              onClick={() => bump(BID_STEP_SATS)}
            >
              <Plus strokeWidth={2.5} />
            </Button>
          </span>
        </h2>

        <form className="mx-auto mt-3 flex w-full max-w-4xl flex-col gap-3" onSubmit={openConfirm}>
          <div className="mx-auto flex w-[90%] flex-col items-stretch gap-2.5 md:w-full md:flex-row md:items-center md:gap-3">
            <div className="relative min-w-0 flex-1">
              <Globe
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden
              />
              <TextField
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Your product URL, @handle, or npub"
                aria-label="Your product URL, X handle, or Nostr npub"
                className="pl-10"
              />
            </div>
            <div className="min-w-0 md:w-64">
              <SelectField
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Choose a category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button type="submit" className="h-11 w-full shrink-0 md:w-auto">
              Claim rank
            </Button>
          </div>
          {identity.trim() ? (
            <div className="mx-auto flex w-[90%] animate-fade-in flex-col gap-2.5 md:w-full md:flex-row md:gap-3">
              <TextField
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name (optional)"
                aria-label="Listing name"
                maxLength={80}
                className="text-sm md:w-64"
              />
              <TextField
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One line about it (optional)"
                aria-label="One line about your listing"
                maxLength={180}
                className="text-sm"
              />
            </div>
          ) : null}
          {error && stage === "form" ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : null}
          {mock ? (
            <p className="text-center text-xs text-muted-foreground">
              Mock rail: LN_ADDRESS is not configured, so invoices are simulated and no sats move.
            </p>
          ) : null}
        </form>
      </fieldset>

      {stage === "confirm" ? (
        <ConfirmDialog
          sats={sats}
          categoryLabel={CATEGORIES.find((c) => c.slug === category)?.label ?? "Other"}
          agreed={agreed}
          termsId={termsId}
          busy={busy}
          error={error}
          onAgree={setAgreed}
          onCancel={() => setStage("form")}
          onContinue={reserve}
        />
      ) : null}

      {stage === "pay" && reservation ? (
        <PayPanel
          reservation={reservation}
          settlement={settlement}
          busy={busy}
          copied={copied}
          error={error}
          onCopy={copyInvoice}
          onMockPay={reservation.mockInvoiceId ? mockPay : undefined}
          onCancel={startOver}
        />
      ) : null}
    </section>
  );
}

function ConfirmDialog({
  sats,
  categoryLabel,
  agreed,
  termsId,
  busy,
  error,
  onAgree,
  onCancel,
  onContinue,
}: {
  sats: number;
  categoryLabel: string;
  agreed: boolean;
  termsId: string;
  busy: boolean;
  error: string | null;
  onAgree: (value: boolean) => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm this rank"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-md animate-fade-in rounded-2xl border border-border bg-popover p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold tracking-[-0.02em]">Confirm this rank</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Close">
            <X strokeWidth={1.5} />
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Check the rank and price, then agree to the rules to continue.
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted px-3 py-2.5">
            <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Rank
            </dt>
            <dd className="mt-0.5 text-lg font-semibold">#1</dd>
            <dd className="text-xs text-muted-foreground">{categoryLabel}</dd>
          </div>
          <div className="rounded-xl bg-muted px-3 py-2.5">
            <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Price
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-primary">
              {formatSatsShort(sats)} sats
            </dd>
            <dd className="text-xs text-muted-foreground">Due now, over Lightning</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-muted-foreground">
          A listing at that rank on the public board. It goes live when the payment confirms.
          Someone else can claim a higher rank. Payments are not refundable.
        </p>

        <label htmlFor={termsId} className="mt-4 flex items-start gap-2.5 text-xs">
          <input
            id={termsId}
            type="checkbox"
            checked={agreed}
            onChange={(e) => onAgree(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
          />
          <span className="text-muted-foreground">
            I have read and agree to the{" "}
            <Link href="/rules" className="text-primary underline underline-offset-2">
              rules
            </Link>{" "}
            of rankstr.
          </span>
        </label>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={onContinue} disabled={!agreed || busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Continue to checkout
          </Button>
        </div>
      </div>
    </div>
  );
}

function PayPanel({
  reservation,
  settlement,
  busy,
  copied,
  error,
  onCopy,
  onMockPay,
  onCancel,
}: {
  reservation: Reservation;
  settlement: Settlement | null;
  busy: boolean;
  copied: boolean;
  error: string | null;
  onCopy: () => void;
  onMockPay?: () => void;
  onCancel: () => void;
}) {
  const failed = settlement?.state === "failed";

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Zap className="size-4 text-primary" strokeWidth={2} aria-hidden />
          Pay {formatSatsShort(reservation.amountSats)} sats over Lightning
        </p>
        <p className="text-xs text-muted-foreground">
          Lands at <span className="font-semibold text-foreground">#{reservation.projectedRank}</span>
        </p>
      </div>

      <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 font-mono text-[11px] leading-relaxed break-all">
        {reservation.invoice.paymentRequest}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          {copied ? <Check strokeWidth={2} /> : <Copy strokeWidth={1.5} />}
          {copied ? "Copied" : "Copy invoice"}
        </Button>
        {!reservation.invoice.mock ? (
          <a
            href={`lightning:${reservation.invoice.paymentRequest}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary px-2.5 text-[0.8rem] font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <Zap className="size-3.5" strokeWidth={2} aria-hidden />
            Open in wallet
          </a>
        ) : null}
        {onMockPay ? (
          <Button type="button" variant="soft" size="sm" onClick={onMockPay} disabled={busy}>
            Mock pay (dev)
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <p
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 text-xs",
          failed ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {!failed && !settlement?.reason ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : null}
        {failed
          ? `Payment failed — ${settlement?.reason ?? "not settled"}`
          : (settlement?.reason ?? "Waiting for the payment to confirm…")}
      </p>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
