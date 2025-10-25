export const STORE_NAME = "TITIKRASA POS" as const;

export const CHANNEL = {
  CUSTOMER: "customer",
  RESELLER: "reseller",
} as const;

export const DISCOUNT_TYPE = {
  PERCENT: "PERCENT",
  AMOUNT: "AMOUNT",
} as const;

export const PAYMENT_METHOD = {
  CASH: "cash",
  TRANSFER: "transfer",
} as const;
