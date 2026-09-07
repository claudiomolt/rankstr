import { MIN_BID_SATS } from "@/lib/rankings";

export default function RulesPage() {
  return (
    <article className="prose-invert max-w-none space-y-4 text-sm text-foreground">
      <h1 className="font-display text-3xl font-bold lowercase">rules</h1>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li>Rank = cumulative sats paid on a listing. Higher sats = higher rank.</li>
        <li>Minimum bid: {MIN_BID_SATS} sats. Raises invoice the delta to exceed current cumulative; result must stay ≥ {MIN_BID_SATS} sats.</li>
        <li>Equal sats → older listing stays higher.</li>
        <li>List with a project URL and/or Nostr npub.</li>
        <li>Bitcoin-only. No other chains in payments or public copy.</li>
        <li>No NSFW, invite/chat dump links, or opaque shorteners.</li>
        <li>Outbound links ship without tracking junk.</li>
      </ul>
      <p className="text-muted-foreground">Live signal board. Powered by sats.</p>
    </article>
  );
}
