import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  createResellerSchema,
  resellerFiltersSchema,
} from "@/features/resellers/schemas";
import { adminClient, ensureAdminOrManager, requireActor } from "@/features/users/server";
import type { ResellerListItem } from "@/features/resellers/types";
import { parseContact, parseTerms } from "@/features/resellers/types";

const MAX_PAGE_SIZE = 200;

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

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { page, pageSize, search, status } = resellerFiltersSchema.parse(params);

    const limit = Math.min(pageSize, MAX_PAGE_SIZE);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = actor.supabase
      .from("resellers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search && search.length > 0) {
      const pattern = `%${search}%`;
      query = query.or(
        `name.ilike.${pattern},contact->>email.ilike.${pattern},contact->>phone.ilike.${pattern}`,
      );
    }

    if (status !== "all") {
      query = query.eq("is_active", status === "active");
    }

    const { data, error, count } = await query;
    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch resellers",
        details: { hint: error.message },
      });
    }

    const items = (data ?? []).map(mapRow);

    return ok(
      { items },
      {
        meta: {
          pagination: {
            page,
            pageSize: limit,
            total: count ?? items.length,
          },
          filters: {
            search: search ?? null,
            status,
          },
        },
      },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const payload = await request.json();
    const body = createResellerSchema.parse(payload);

    const admin = adminClient();
    const { data, error } = await admin
      .from("resellers")
      .insert({
        name: body.name,
        contact: body.contact ?? {},
        terms: body.terms ?? {},
        is_active: body.isActive ?? true,
      })
      .select("*")
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to create reseller",
        details: { hint: error.message },
      });
    }

    return ok({ reseller: mapRow(data) });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
