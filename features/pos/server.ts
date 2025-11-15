import type { SupabaseClient } from "@supabase/supabase-js";

import type { MenuListItem } from "@/features/menus/types";
import { mapMenuRow, type RawMenuRow } from "@/features/menus/mappers";
import type { ResellerListItem } from "@/features/resellers/types";
import { parseContact, parseTerms } from "@/features/resellers/types";
import { ORDER_SELECT } from "@/features/orders/server";
import { mapOrderRow } from "@/features/orders/mappers";
import type { RawOrderRow, OrderFilters } from "@/features/orders/types";
import { appError, ERR } from "@/lib/utils/errors";
import type { ActorContext } from "@/features/users/server";
import { getSettings } from "@/features/settings/server";

const DEFAULT_TAX_RATE = 0.11;
const DEFAULT_ORDER_LIMIT = 20;

type Supabase = SupabaseClient;

async function loadMenus(
  supabase: Supabase,
  options: { search?: string | null } = {},
): Promise<MenuListItem[]> {
  let query = supabase
    .from("menus")
    .select(
      `
      id,
      name,
      sku,
      category_id,
      categories ( id, name, icon_url ),
      price,
      reseller_price,
      is_active,
      thumbnail_url,
      variants,
      created_at
    `,
    )
    .eq("is_active", true);

  const searchTerm = options.search?.trim();
  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load POS menus",
      details: { hint: error.message },
    });
  }

  return ((data as unknown) as RawMenuRow[] | null)?.map(mapMenuRow) ?? [];
}

async function loadResellers(supabase: Supabase): Promise<ResellerListItem[]> {
  const { data, error } = await supabase
    .from("resellers")
    .select("id, name, contact, terms, is_active, created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load resellers",
      details: { hint: error.message },
    });
  }

  return (
    data?.map((row) => ({
      id: row.id,
      name: row.name,
      contact: parseContact(row.contact),
      terms: parseTerms(row.terms),
      is_active: row.is_active,
      created_at: row.created_at,
    })) ?? []
  );
}

async function loadOrders(
  supabase: Supabase,
  limit: number,
): Promise<RawOrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load POS orders",
      details: { hint: error.message },
    });
  }

  return ((data as unknown) as RawOrderRow[] | null) ?? [];
}

export type PosBootstrap = {
  menus: MenuListItem[];
  resellers: ResellerListItem[];
  orders: {
    items: ReturnType<typeof mapOrderRow>[];
    meta: { filters: OrderFilters };
  };
  defaultTaxRate: number;
};

export async function getPosBootstrap(
  actor: ActorContext,
  options: { orderLimit?: number } = {},
): Promise<PosBootstrap> {
  const orderLimit = options.orderLimit ?? DEFAULT_ORDER_LIMIT;

  const [menus, resellers, orderRows, settings] = await Promise.all([
    loadMenus(actor.supabase),
    loadResellers(actor.supabase),
    loadOrders(actor.supabase, orderLimit),
    getSettings(actor),
  ]);

  const orderFilters: OrderFilters = {
    channel: "all",
    status: "open",
    paymentStatus: "all",
    limit: orderLimit,
  };

  return {
    menus,
    resellers,
    orders: {
      items: orderRows.map(mapOrderRow),
      meta: { filters: orderFilters },
    },
    defaultTaxRate: settings.tax.rate ?? DEFAULT_TAX_RATE,
  };
}

export async function searchPosMenus(
  actor: ActorContext,
  options: { search?: string | null } = {},
) {
  return loadMenus(actor.supabase, options);
}
