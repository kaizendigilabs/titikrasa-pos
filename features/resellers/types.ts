import type { Json, Tables } from "@/lib/types/database";

export type ResellerRow = Tables<"resellers">;

export type ResellerContact = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
};

export type ResellerTerms = {
  paymentTermDays?: number | null;
  discountPercent?: number | null;
};

export type ResellerListItem = {
  id: string;
  name: string;
  contact: ResellerContact;
  terms: ResellerTerms;
  is_active: boolean;
  created_at: string;
};

export function parseContact(contact: Json | null): ResellerContact {
  if (!contact || typeof contact !== "object") {
    return {};
  }
  const { phone = null, email = null, address = null, note = null } =
    contact as Record<string, unknown>;
  return {
    phone: typeof phone === "string" ? phone : null,
    email: typeof email === "string" ? email : null,
    address: typeof address === "string" ? address : null,
    note: typeof note === "string" ? note : null,
  };
}

export function parseTerms(terms: Json | null): ResellerTerms {
  if (!terms || typeof terms !== "object") {
    return {};
  }
  const {
    paymentTermDays = null,
    discountPercent = null,
  } = terms as Record<string, unknown>;
  return {
    paymentTermDays:
      typeof paymentTermDays === "number" ? paymentTermDays : null,
    discountPercent:
      typeof discountPercent === "number" ? discountPercent : null,
  };
}
