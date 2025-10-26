import { NextRequest } from "next/server";

import { loginSchema } from "@/features/auth/schemas";
import { ZodError } from "zod";
import { ok, fail } from "@/lib/utils/api-response";
import { createServerClient } from "@/lib/supabase/server";
import { AppError, ERR, appError } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const payload = await request.json();
    const { email, password } = loginSchema.parse(payload);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw mapAuthError(error);
    }

    const user = data.user;
    if (!user) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Unable to retrieve authenticated user",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, is_active")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to load user profile",
        details: { hint: profileError.message },
      });
    }

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      throw appError(ERR.FORBIDDEN, {
        message: "Account is inactive. Contact administrator.",
      });
    }

    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return ok(
      { userId: user.id },
      {
        meta: {
          sessionExpiresAt: data.session?.expires_at ?? null,
        },
      },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }

    if (error instanceof ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Invalid credentials payload",
          details: { issues: error.issues },
        }),
      );
    }

    return fail(error);
  }
}

function mapAuthError(error: { message: string }) {
  const message = error.message || "";
  if (message.toLowerCase().includes("invalid login credentials")) {
    return appError(ERR.UNAUTHORIZED, {
      message: "Email or password is incorrect",
    });
  }

  return appError(ERR.SERVER_ERROR, {
    message: "Unable to sign in. Please try again.",
    details: { hint: message },
  });
}
