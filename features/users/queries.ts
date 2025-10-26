import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

import { mapProfileToUser } from "./mappers";
import type { RawUserRow } from "./mappers";
import type { UserListItem } from "./types";

type AnySupabase = SupabaseClient<Database>;

export async function fetchUserById(
  client: AnySupabase,
  userId: string,
): Promise<UserListItem | null> {
  const { data, error } = await client
    .from("profiles")
    .select(
      `
      user_id,
      name,
      email,
      phone,
      avatar,
      is_active,
      last_login_at,
      created_at,
      updated_at,
      user_roles (
        role_id,
        roles (
          id,
          name
        )
      )
    `,
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProfileToUser(data as RawUserRow);
}
