import { ok, fail } from "@/lib/utils/api-response";
import { createServerClient } from "@/lib/supabase/server";
import { appError, ERR } from "@/lib/utils/errors";

export async function POST() {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to sign out",
        details: { hint: error.message },
      });
    }

    return ok({ success: true });
  } catch (error) {
    return fail(error);
  }
}
