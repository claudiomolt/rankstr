export type InvoiceRequest = {
  amountSats: number;
  memo: string;
  metadata?: Record<string, string>;
};

export type Invoice = {
  invoiceId: string;
  paymentRequest: string;
  paymentHash: string;
  amountSats: number;
  expiresAt: string;
  mock: boolean;
};

export type PaymentEvent = {
  invoiceId: string;
  paymentHash?: string;
  status: "paid" | "expired" | "pending";
  amountSats?: number;
};
