import { appError, ERR } from "@/lib/utils/errors";
import type { ActorContext } from "@/features/users/server";
import { resellerFiltersSchema } from "./schemas";
import type { ResellerListItem } from "./types";
import { parseContact, parseTerms } from "./types";

function mapRow(row: any): ResellerListItem {
  return {
    id: row.id,
    name: row.name,
    contact: parseContact(row.contact),
    terms: parseTerms(row.terms),
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export async function getResellersTableBootstrap(
  actor: ActorContext,
  options: { pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? 50;
  const filters = resellerFiltersSchema.parse({
    page: "1",
    pageSize: String(pageSize),
    status: "all",
  });

  const { data, error, count } = await actor.supabase
    .from("resellers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, filters.pageSize - 1);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load resellers",
      details: { hint: error.message },
    });
  }

  const initialResellers = (data ?? []).map(mapRow);

  return {
    initialResellers,
    initialMeta: {
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? initialResellers.length,
      },
      filters: {
        search: null as string | null,
        status: "all" as const,
      },
    },
  };
}
