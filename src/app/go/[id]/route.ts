import { NextResponse } from "next/server";
import { outboundHref } from "@/lib/rankings";
import { getStore } from "@/lib/store";
import { stripQueryParams } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Outbound click. Records the click, then sends the visitor to the submitted
 * URL or profile with query parameters removed. Only public (paid) listings
 * resolve here.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = getStore();
  const listing = await store.getListing(id);

  if (!listing || listing.cumulativeSats <= 0) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const href = outboundHref(listing);
  if (!href) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  await store.recordClick(listing.id);

  return NextResponse.redirect(stripQueryParams(href), {
    status: 302,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
