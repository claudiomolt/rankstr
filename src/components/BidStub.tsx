import { BidForm } from "./BidForm";
import type { Listing } from "@/lib/rankings";
import { seedListings } from "@/lib/seed";

/** @deprecated Use BidForm — kept so older imports keep working. */
export function BidStub({ listings = seedListings }: { listings?: Listing[] }) {
  return <BidForm listings={listings} />;
}
