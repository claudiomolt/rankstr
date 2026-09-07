import { MIN_BID_SATS } from "@/lib/rankings";

/** P0–P2: UI stub only — Lightning invoices land in P3. */
export function BidStub() {
  return (
    <section
      className="border border-border bg-card p-4"
      style={{ borderLeft: "3px solid hsl(var(--primary))" }}
    >
      <h2 className="font-display text-lg font-semibold lowercase">climb rank</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pay sats over Lightning to create or raise a listing. Min bid {MIN_BID_SATS} sats.
      </p>
      <p className="mt-2 font-mono text-xs text-[color:var(--rs-frost)]">
        Invoice flow stubbed until P3 (LSP). Bitcoin-only.
      </p>
      <button
        type="button"
        disabled
        className="mt-4 rounded-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-60"
      >
        Pay & climb (soon)
      </button>
    </section>
  );
}
