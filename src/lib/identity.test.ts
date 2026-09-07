import { describe, expect, it } from "vitest";
import { normalizeIdentity, resolveIdentity } from "./identity";

function key(input: string): string {
  const result = normalizeIdentity(input);
  if (!result.ok) throw new Error(`expected ${input} to normalize, got ${result.code}`);
  return result.identity.key;
}

function rejection(input: string) {
  const result = normalizeIdentity(input);
  if (result.ok) throw new Error(`expected ${input} to be rejected`);
  return result;
}

/** A real bech32 npub, since validation decodes rather than pattern-matches. */
const NPUB = "npub18fgzegkpe2efl54xs4jcfvhfjetf30k9chzfvkn346tpwsrhrp3ssju3rs";

describe("websites", () => {
  it("treats scheme, www, trailing slash, and case as the same listing", () => {
    const canonical = key("https://example.com");
    expect(key("http://example.com")).toBe(canonical);
    expect(key("https://www.example.com/")).toBe(canonical);
    expect(key("EXAMPLE.com")).toBe(canonical);
    expect(key("example.com")).toBe(canonical);
  });

  it("strips every query parameter, so affiliate and referral URLs cannot survive", () => {
    const result = normalizeIdentity("https://example.com/pricing?ref=aff123&utm_source=x#top");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.href).toBe("https://example.com/pricing");
    expect(result.identity.key).toBe("url:example.com/pricing");
  });

  it("keeps different paths as different listings", () => {
    expect(key("https://example.com/a")).not.toBe(key("https://example.com/b"));
  });

  it("rejects input that is not a website, handle, or npub", () => {
    expect(rejection("not a url").code).toBe("invalid");
    expect(rejection("   ").code).toBe("empty");
    expect(rejection("ftp://example.com/file").code).toBe("invalid");
  });
});

describe("platform links keyed by path", () => {
  it("keeps GitHub repos apart and ignores deeper paths", () => {
    expect(key("https://github.com/owner/repo")).toBe("url:github.com/owner/repo");
    expect(key("https://github.com/owner/repo/tree/main/src")).toBe("url:github.com/owner/repo");
    expect(key("https://github.com/owner/other")).not.toBe(key("https://github.com/owner/repo"));
  });

  it("keys App Store links on the app id, not the locale", () => {
    expect(key("https://apps.apple.com/us/app/some-app/id6446930619")).toBe(
      "url:apps.apple.com/app/id6446930619",
    );
    expect(key("https://apps.apple.com/de/app/andere-app/id6446930619")).toBe(
      "url:apps.apple.com/app/id6446930619",
    );
    expect(key("https://apps.apple.com/us/app/other/id999")).not.toBe(
      key("https://apps.apple.com/us/app/some-app/id6446930619"),
    );
  });

  it("keys Play Store links on the package so different apps do not share a bid", () => {
    expect(key("https://play.google.com/store/apps/details?id=com.example.one&hl=en")).toBe(
      "url:play.google.com/store/apps/com.example.one",
    );
    expect(key("https://play.google.com/store/apps/details?id=com.example.two")).not.toBe(
      key("https://play.google.com/store/apps/details?id=com.example.one"),
    );
  });
});

describe("X handles", () => {
  it("accepts a bare handle", () => {
    const result = normalizeIdentity("@Jack");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.type).toBe("x");
    expect(result.identity.key).toBe("x:jack");
    expect(result.identity.display).toBe("@Jack");
    expect(result.identity.href).toBe("https://x.com/Jack");
  });

  it("collapses x.com and twitter.com profile URLs onto the handle", () => {
    expect(key("https://x.com/jack")).toBe("x:jack");
    expect(key("https://twitter.com/jack")).toBe("x:jack");
    expect(key("https://mobile.twitter.com/JACK/")).toBe("x:jack");
    expect(key("@jack")).toBe("x:jack");
  });

  it("does not read site chrome as a handle", () => {
    expect(rejection("https://x.com/i/status/123").code).toBe("invalid");
    expect(rejection("https://x.com/settings").code).toBe("invalid");
  });

  it("rejects handles that X could not issue", () => {
    expect(rejection("@way_too_long_handle_here").code).toBe("invalid");
    expect(rejection("@bad-handle").code).toBe("invalid");
  });
});

describe("npub", () => {
  it("accepts a valid npub as its own identity", () => {
    const result = normalizeIdentity(NPUB);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.type).toBe("npub");
    expect(result.identity.key).toBe(`npub:${NPUB}`);
    expect(result.identity.href).toBeUndefined();
  });

  it("accepts the nostr: prefix", () => {
    expect(key(`nostr:${NPUB}`)).toBe(`npub:${NPUB}`);
  });

  it("rejects a malformed npub", () => {
    expect(rejection("npub1notarealkey").code).toBe("bad_npub");
  });
});

describe("what you cannot list", () => {
  it("rejects chat and invite links", () => {
    for (const link of [
      "https://t.me/somegroup",
      "https://chat.whatsapp.com/abc123",
      "https://discord.gg/abc123",
      "https://m.me/someone",
      "https://signal.group/#abc",
    ]) {
      expect(rejection(link).code).toBe("chat_link");
    }
  });

  it("rejects adult platforms and NSFW paths", () => {
    expect(rejection("https://pornhub.com").code).toBe("nsfw");
    expect(rejection("https://onlyfans.com/someone").code).toBe("nsfw");
    expect(rejection("https://example.com/nsfw/gallery").code).toBe("nsfw");
  });

  it("rejects a shortener rather than listing it as-is", () => {
    expect(rejection("https://bit.ly/abc123").code).toBe("shortener");
    expect(rejection("https://t.co/abc123").code).toBe("shortener");
  });
});

describe("resolveIdentity", () => {
  it("replaces a shortener with the URL it redirects to", async () => {
    const result = await resolveIdentity("https://bit.ly/abc123", async () => "https://example.com/real?ref=x");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.key).toBe("url:example.com/real");
    expect(result.identity.href).toBe("https://example.com/real");
  });

  it("keeps a shortener rejected when the redirect cannot be resolved", async () => {
    const result = await resolveIdentity("https://bit.ly/abc123", async () => null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("shortener");
  });

  it("does not accept a shortener that points at another shortener", async () => {
    const result = await resolveIdentity("https://bit.ly/abc", async () => "https://tinyurl.com/def");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("shortener");
  });

  it("applies the content rules to the resolved destination", async () => {
    const result = await resolveIdentity("https://bit.ly/abc", async () => "https://t.me/group");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("chat_link");
  });

  it("leaves a normal URL untouched without a network hop", async () => {
    const result = await resolveIdentity("https://example.com", async () => {
      throw new Error("should not resolve a non-shortener");
    });
    expect(result.ok).toBe(true);
  });
});
