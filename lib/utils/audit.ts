import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/types/database";

type AdminClient = SupabaseClient<Database>;

type AuditPayload = {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Json | null;
  after?: Json | null;
};

export async function recordAudit(
  client: AdminClient,
  payload: AuditPayload,
): Promise<void> {
  const { error } = await client.from("audit_logs").insert({
    actor_id: payload.actorId,
    action: payload.action,
    entity: payload.entity,
    entity_id: payload.entityId ?? null,
    before: payload.before ?? null,
    after: payload.after ?? null,
  });

  if (error) {
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}
