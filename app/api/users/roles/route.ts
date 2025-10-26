import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { data, error } = await actor.supabase
      .from("roles")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to load roles",
        details: { hint: error.message },
      });
    }

    return ok({ roles: data });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }

    return fail(error);
  }
}
