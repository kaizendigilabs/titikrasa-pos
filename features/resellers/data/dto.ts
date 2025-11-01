import type { Json } from "@/lib/types/database";

import type { ResellerListItem } from "../types";
import { parseContact, parseTerms } from "../types";

export type RawResellerRow = {
  id: string;
  name: string;
  contact: Json | null;
  terms: Json | null;
  is_active: boolean;
  created_at: string;
};

export function mapResellerRow(row: RawResellerRow): ResellerListItem {
  return {
    id: row.id,
    name: row.name,
    contact: parseContact(row.contact),
    terms: parseTerms(row.terms),
    is_active: row.is_active,
    created_at: row.created_at,
  };
}
