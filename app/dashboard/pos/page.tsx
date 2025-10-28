import { redirect } from "next/navigation";

import { PosScreen } from "./PosScreen";
import { mapMenuRow, type RawMenuRow } from "@/features/menus/mappers";
import { parseContact, parseTerms, type ResellerListItem } from "@/features/resellers/types";
import { ORDER_SELECT } from "@/features/orders/server";
import { mapOrderRow } from "@/features/orders/mappers";
import type { RawOrderRow } from "@/features/orders/types";
import type { OrderFilters } from "@/features/orders/types";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

const POS_ORDER_LIMIT = 20;

export default async function PosPage() {
  let actor: Awaited<ReturnType<typeof requireActor>>;
  try {
    actor = await requireActor();
    ensureStaffOrAbove(actor.roles);
  } catch (error) {
    if (
      error instanceof AppError &&
      error.statusCode === ERR.FORBIDDEN.statusCode
    ) {
      redirect(
        "/dashboard?status=forbidden&message=Anda%20tidak%20memiliki%20akses%20ke%20POS",
      );
    }
    redirect("/dashboard");
  }

  const [menus, resellers, orders] = await Promise.all([
    loadMenus(actor.supabase),
    loadResellers(actor.supabase),
    loadOrders(actor.supabase),
  ]);

  const defaultTaxRate = 0.11;

  const initialOrderFilters: OrderFilters = {
    channel: "all",
    status: "open",
    paymentStatus: "all",
    limit: POS_ORDER_LIMIT,
  };

  return (
    <PosScreen
      initialMenus={menus}
      initialResellers={resellers}
      initialOrderData={{ items: orders, meta: { filters: initialOrderFilters } }}
      defaultTaxRate={defaultTaxRate}
    />
  );
}

async function loadMenus(supabase: Awaited<ReturnType<typeof requireActor>>["supabase"]) {
  const { data, error } = await supabase
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
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as RawMenuRow[] | null)?.map(mapMenuRow) ?? [];
}

async function loadResellers(supabase: Awaited<ReturnType<typeof requireActor>>["supabase"]) {
  const { data, error } = await supabase
    .from("resellers")
    .select("id, name, contact, terms, is_active, created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
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
  ) satisfies ResellerListItem[];
}

async function loadOrders(supabase: Awaited<ReturnType<typeof requireActor>>["supabase"]) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(POS_ORDER_LIMIT);

  if (error) {
    throw error;
  }

  return (data as RawOrderRow[] | null)?.map(mapOrderRow) ?? [];
}
