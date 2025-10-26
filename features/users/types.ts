import type { Tables } from "@/lib/types/database";

export type ProfileRow = Tables<"profiles">;
export type RoleRow = Tables<"roles">;
export type UserRoleRow = Tables<"user_roles">;

export type UserListItem = ProfileRow & {
  role: string | null;
  roleId: string | null;
};
