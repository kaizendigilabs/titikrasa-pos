import type { Tables } from "@/lib/types/database";

import type { UserListItem } from "./types";

type RoleRelation = {
  role_id: Tables<"user_roles">["role_id"];
  roles: Pick<Tables<"roles">, "id" | "name"> | null;
};

export type RawUserRow = Tables<"profiles"> & {
  user_roles: RoleRelation[] | RoleRelation | null;
};

export function mapProfileToUser(row: RawUserRow): UserListItem {
  const relation = row.user_roles;
  const primaryRole = Array.isArray(relation)
    ? relation[0] ?? null
    : relation ?? null;

  return {
    ...row,
    role: primaryRole?.roles?.name ?? null,
    roleId: primaryRole?.role_id ?? null,
  };
}
