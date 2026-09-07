import type { Listing } from "./rankings";

/** Listing factory for tests: only the fields a case cares about need spelling out. */
export function makeListing(
  partial: Partial<Listing> & Pick<Listing, "id" | "cumulativeSats" | "createdAt">,
): Listing {
  return {
    title: `listing-${partial.id}`,
    identityKey: `url:${partial.id}.example`,
    identityType: "url",
    url: `https://${partial.id}.example`,
    categorySlug: "other",
    clickCount: 0,
    status: "open",
    ...partial,
  };
}
