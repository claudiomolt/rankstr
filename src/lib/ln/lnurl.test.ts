import { describe, expect, it, vi } from "vitest";
import {
  LnurlError,
  fetchPayParams,
  lnurlpEndpoint,
  parseLightningAddress,
  requestInvoice,
  verifyInvoice,
  waitForSettlement,
} from "./lnurl";
import type { FetchLike, LnurlPayParams, VerifyResult } from "./types";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/** Serves canned JSON per URL and records what was requested. */
function stubFetch(routes: Record<string, unknown>, status = 200) {
  const calls: string[] = [];
  const impl: FetchLike = async (url) => {
    calls.push(url);
    const match = Object.keys(routes).find((route) => url.startsWith(route));
    if (!match) throw new Error(`unexpected request: ${url}`);
    return jsonResponse(routes[match], status);
  };
  return { impl, calls };
}

const PAY_PARAMS: LnurlPayParams = {
  callback: "https://pay.example/lnurlp/rankstr/callback",
  minSendable: 1000,
  maxSendable: 100_000_000,
  metadata: '[["text/plain","rankstr"]]',
  tag: "payRequest",
};

describe("LUD16 Lightning Address", () => {
  it("splits name@domain", () => {
    expect(parseLightningAddress("rankstr@pay.example")).toEqual({
      name: "rankstr",
      domain: "pay.example",
    });
    expect(parseLightningAddress("  RankStr@Pay.Example  ")).toEqual({
      name: "rankstr",
      domain: "pay.example",
    });
  });

  it("rejects anything that is not an address", () => {
    expect(parseLightningAddress("rankstr")).toBeNull();
    expect(parseLightningAddress("a@b@c")).toBeNull();
    expect(parseLightningAddress("@pay.example")).toBeNull();
    expect(parseLightningAddress("rankstr@localhost")).toBeNull();
    expect(parseLightningAddress("rank str@pay.example")).toBeNull();
  });

  it("builds the .well-known endpoint, using http for onion hosts", () => {
    expect(lnurlpEndpoint({ name: "rankstr", domain: "pay.example" })).toBe(
      "https://pay.example/.well-known/lnurlp/rankstr",
    );
    expect(lnurlpEndpoint({ name: "rankstr", domain: "abc.onion" })).toBe(
      "http://abc.onion/.well-known/lnurlp/rankstr",
    );
  });
});

describe("LUD06 pay params", () => {
  it("reads the callback and sendable bounds from the well-known endpoint", async () => {
    const { impl, calls } = stubFetch({ "https://pay.example/.well-known/lnurlp/rankstr": PAY_PARAMS });
    const params = await fetchPayParams({ name: "rankstr", domain: "pay.example" }, impl);

    expect(calls[0]).toBe("https://pay.example/.well-known/lnurlp/rankstr");
    expect(params.callback).toBe(PAY_PARAMS.callback);
    expect(params.minSendable).toBe(1000);
  });

  it("surfaces an LNURL error response", async () => {
    const { impl } = stubFetch({
      "https://pay.example": { status: "ERROR", reason: "unknown user" },
    });
    await expect(
      fetchPayParams({ name: "nobody", domain: "pay.example" }, impl),
    ).rejects.toThrow(/unknown user/);
  });

  it("rejects an endpoint that is not payRequest", async () => {
    const { impl } = stubFetch({ "https://pay.example": { tag: "withdrawRequest" } });
    await expect(fetchPayParams({ name: "x", domain: "pay.example" }, impl)).rejects.toBeInstanceOf(
      LnurlError,
    );
  });

  it("rejects a non-2xx response", async () => {
    const { impl } = stubFetch({ "https://pay.example": {} }, 500);
    await expect(fetchPayParams({ name: "x", domain: "pay.example" }, impl)).rejects.toThrow(
      /HTTP 500/,
    );
  });
});

describe("LUD06 invoice request", () => {
  it("asks the callback for the amount in millisats and picks up the LUD21 verify URL", async () => {
    const { impl, calls } = stubFetch({
      "https://pay.example/lnurlp/rankstr/callback": {
        pr: "lnbc21u1p3invoice",
        verify: "https://pay.example/lnurlp/verify/abc",
      },
    });

    const invoice = await requestInvoice(PAY_PARAMS, 2100, impl);

    expect(calls[0]).toContain("amount=2100000");
    expect(invoice.paymentRequest).toBe("lnbc21u1p3invoice");
    expect(invoice.verifyUrl).toBe("https://pay.example/lnurlp/verify/abc");
  });

  it("reports no verify URL when the service does not support LUD21", async () => {
    const { impl } = stubFetch({ "https://pay.example": { pr: "lnbc1invoice" } });
    const invoice = await requestInvoice(PAY_PARAMS, 2100, impl);
    expect(invoice.verifyUrl).toBeNull();
  });

  it("refuses amounts outside the sendable bounds before hitting the network", async () => {
    const { impl, calls } = stubFetch({ "https://pay.example": {} });
    await expect(requestInvoice(PAY_PARAMS, 0.5, impl)).rejects.toThrow(/outside what/);
    await expect(requestInvoice(PAY_PARAMS, 200_000, impl)).rejects.toThrow(/outside what/);
    expect(calls).toHaveLength(0);
  });

  it("only sends a comment when the service allows one", async () => {
    const withComment = stubFetch({ "https://pay.example": { pr: "lnbc1" } });
    await requestInvoice({ ...PAY_PARAMS, commentAllowed: 8 }, 2100, withComment.impl, "rankstr bid");
    expect(withComment.calls[0]).toContain("comment=rankstr");

    const without = stubFetch({ "https://pay.example": { pr: "lnbc1" } });
    await requestInvoice(PAY_PARAMS, 2100, without.impl, "rankstr bid");
    expect(without.calls[0]).not.toContain("comment=");
  });

  it("errors when the callback returns no invoice", async () => {
    const { impl } = stubFetch({ "https://pay.example": { routes: [] } });
    await expect(requestInvoice(PAY_PARAMS, 2100, impl)).rejects.toThrow(/did not return an invoice/);
  });
});

describe("LUD21 verify", () => {
  const verifyUrl = "https://pay.example/lnurlp/verify/abc";

  it("reports settled once the payment lands", async () => {
    const { impl } = stubFetch({
      [verifyUrl]: { status: "OK", settled: true, preimage: "deadbeef", pr: "lnbc1" },
    });
    expect(await verifyInvoice(verifyUrl, impl)).toEqual({ state: "settled", preimage: "deadbeef" });
  });

  it("reports pending while the invoice is unpaid", async () => {
    const { impl } = stubFetch({ [verifyUrl]: { status: "OK", settled: false, preimage: null } });
    expect(await verifyInvoice(verifyUrl, impl)).toEqual({ state: "pending" });
  });

  it("treats an LNURL error as terminal", async () => {
    const { impl } = stubFetch({ [verifyUrl]: { status: "ERROR", reason: "expired" } });
    expect(await verifyInvoice(verifyUrl, impl)).toEqual({ state: "failed", reason: "expired" });
  });

  it("keeps waiting through a transport blip rather than failing a real payment", async () => {
    const impl: FetchLike = async () => {
      throw new Error("connection reset");
    };
    const result = await verifyInvoice(verifyUrl, impl);
    expect(result.state).toBe("pending");
  });

  it("fails on a 4xx, which will not recover", async () => {
    const { impl } = stubFetch({ [verifyUrl]: {} }, 404);
    expect((await verifyInvoice(verifyUrl, impl)).state).toBe("failed");
  });
});

describe("waitForSettlement", () => {
  const noSleep = async () => {};

  it("returns as soon as the invoice settles", async () => {
    const check = vi
      .fn<() => Promise<VerifyResult>>()
      .mockResolvedValueOnce({ state: "pending" })
      .mockResolvedValueOnce({ state: "pending" })
      .mockResolvedValueOnce({ state: "settled", preimage: "abc" });

    const result = await waitForSettlement(check, {
      timeoutMs: 10_000,
      intervalMs: 100,
      sleep: noSleep,
    });

    expect(result).toEqual({ state: "settled", preimage: "abc" });
    expect(check).toHaveBeenCalledTimes(3);
  });

  it("stops immediately on a terminal failure", async () => {
    const check = vi
      .fn<() => Promise<VerifyResult>>()
      .mockResolvedValue({ state: "failed", reason: "expired" });

    const result = await waitForSettlement(check, { timeoutMs: 10_000, sleep: noSleep });

    expect(result.state).toBe("failed");
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("times out on a clock it never blocks on", async () => {
    let clock = 0;
    const check = vi.fn<() => Promise<VerifyResult>>().mockResolvedValue({ state: "pending" });

    const result = await waitForSettlement(check, {
      timeoutMs: 1000,
      intervalMs: 250,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
    });

    expect(result.state).toBe("pending");
    expect(result.reason).toMatch(/timed out/);
    // Checks at t=0, 250, 500, 750, and 1000: the deadline itself still gets a look.
    expect(check).toHaveBeenCalledTimes(5);
    expect(clock).toBe(1000);
  });
});
