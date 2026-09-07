export type Listing = {
  id: string;
  title: string;
  url?: string;
  npub?: string;
  cumulativeSats: number;
  createdAt: string;
  status: "live" | "open" | "climbing";
};

/** Rank = cumulative sats DESC; equal sats → older listing higher (createdAt ASC). */
export function sortListings(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => {
    if (b.cumulativeSats !== a.cumulativeSats) {
      return b.cumulativeSats - a.cumulativeSats;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export const MIN_BID_SATS = 1000;

/** Invoice amount to raise listing above current cumulative. Result must stay ≥ MIN_BID_SATS. */
export function raiseDeltaSats(currentCumulative: number, targetCumulative: number): number | null {
  if (targetCumulative < MIN_BID_SATS) return null;
  if (targetCumulative <= currentCumulative) return null;
  return targetCumulative - currentCumulative;
}
