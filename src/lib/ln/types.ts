export type InvoiceRequest = {
  amountSats: number;
  memo: string;
};

export type Invoice = {
  /** Local handle for the invoice. Payment hash when we can read one, else derived. */
  invoiceId: string;
  /** BOLT11 payment request. */
  paymentRequest: string;
  /** LUD21 verify endpoint. Null when the payer's service does not advertise one. */
  verifyUrl: string | null;
  amountSats: number;
  expiresAt: string;
  /** True when no LN_ADDRESS is configured and nothing real was created. */
  mock: boolean;
};

export type VerifyState = "settled" | "pending" | "failed";

export type VerifyResult = {
  state: VerifyState;
  preimage?: string;
  reason?: string;
  mock?: boolean;
};

/** LUD06 payRequest parameters served from the LUD16 .well-known endpoint. */
export type LnurlPayParams = {
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  tag: "payRequest";
  commentAllowed?: number;
};

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
