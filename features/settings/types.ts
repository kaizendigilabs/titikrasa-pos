export type DiscountMode = "none" | "percentage" | "nominal";
export type ReceiptAutoReset = "none" | "daily";

export type TaxSettings = {
  rate: number;
  autoApply: boolean;
  label?: string | null;
};

export type DiscountSettings = {
  mode: DiscountMode;
  value: number;
};

export type StoreProfileSettings = {
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  footerNote: string | null;
};

export type ReceiptNumberingSettings = {
  posPrefix: string;
  resellerPrefix: string;
  padding: number;
  autoReset: ReceiptAutoReset;
};

export type SettingsPayload = {
  tax: TaxSettings;
  discount: DiscountSettings;
  storeProfile: StoreProfileSettings;
  receiptNumbering: ReceiptNumberingSettings;
};

export type SettingsUpdateInput = Partial<{
  tax: TaxSettings;
  discount: DiscountSettings;
  storeProfile: StoreProfileSettings;
  receiptNumbering: ReceiptNumberingSettings;
}>;
