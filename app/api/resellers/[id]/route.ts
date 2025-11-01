import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import { adminClient, ensureAdminOrManager, requireActor } from "@/features/users/server";
import { updateResellerSchema } from "@/features/resellers/model/forms/schema";
import type { ResellerListItem } from "@/features/resellers/types";
import { parseContact, parseTerms } from "@/features/resellers/types";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;

    const payload = await request.json();
    const body = updateResellerSchema.parse(payload);

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.contact !== undefined) updates.contact = body.contact;
    if (body.terms !== undefined) updates.terms = body.terms;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    if (!Object.keys(updates).length) {
      throw appError(ERR.BAD_REQUEST, { message: "No changes provided" });
    }

    const admin = adminClient();
    const { data, error } = await admin
      .from("resellers")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to update reseller",
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;

    const admin = adminClient();
    const { error } = await admin.from("resellers").delete().eq("id", id);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete reseller",
        details: { hint: error.message },
      });
    }

    return ok({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
