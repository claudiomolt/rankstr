import { NextResponse } from "next/server";
import { fetchProfile } from "@/lib/nostr";

export const runtime = "nodejs";

/** Soft profile lookup for clients. Never blocks board/bid — returns profile: null on miss. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const npub = searchParams.get("npub");
    if (!npub || !npub.trim()) {
      return NextResponse.json({ error: "npub is required" }, { status: 400 });
    }

    const profile = await fetchProfile(npub.trim());

    return NextResponse.json(
      { profile },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    console.error("GET /api/nostr/profile", err);
    return NextResponse.json(
      { profile: null },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
        },
      },
    );
  }
}
