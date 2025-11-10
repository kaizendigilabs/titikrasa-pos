export const MANAGED_ROLES = ["admin", "manager", "staff"] as const;

export type ManagedRole = (typeof MANAGED_ROLES)[number];
export type StatusFilter = "all" | "active" | "inactive";
export type RoleFilter = "all" | ManagedRole;

export const DEFAULT_ROLE: ManagedRole = "staff";

export function isManagedRole(
  role: string | null | undefined,
): role is ManagedRole {
  return !!role && MANAGED_ROLES.includes(role as ManagedRole);
}
