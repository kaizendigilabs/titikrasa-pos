import { redirect } from "next/navigation";

import { ResellersTableScreen } from "@/features/resellers/ui/components/reseller-table";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { resellerFiltersSchema } from "@/features/resellers/model/forms/schema";
import type { ResellerListItem } from "@/features/resellers/types";
import { mapResellerRow, type RawResellerRow } from "@/features/resellers/data/dto";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;

export default async function ResellersPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const filters = resellerFiltersSchema.parse({
      page: "1",
      pageSize: String(DEFAULT_PAGE_SIZE),
      status: "all",
    });

    const { data, error, count } = await actor.supabase
      .from("resellers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, filters.pageSize - 1);

    if (error) {
      throw error;
    }

    const initialResellers: ResellerListItem[] =
      data?.map((row) =>
        mapResellerRow({
          id: row.id,
          name: row.name,
          contact: (row.contact ?? null) as RawResellerRow['contact'],
          terms: (row.terms ?? null) as RawResellerRow['terms'],
          is_active: row.is_active,
          created_at: row.created_at,
        }),
      ) ?? [];

    const initialMeta = {
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? initialResellers.length,
      },
      filters: {
        search: null as string | null,
        status: "all" as const,
      },
    };

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Resellers</h1>
          <p className="text-sm text-muted-foreground">
            Manage reseller partners, their contact information, and payment terms.
          </p>
        </div>
        <ResellersTableScreen
          initialItems={initialResellers}
          initialMeta={initialMeta}
          canManage={actor.roles.isAdmin || actor.roles.isManager}
        />
      </div>
    );
  } catch (error) {
    console.error("[RESELLERS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }
}
