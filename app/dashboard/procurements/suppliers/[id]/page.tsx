import Link from "next/link";
import { redirect } from "next/navigation";

import { CatalogCreateForm } from "../CatalogCreateForm";
import { CatalogItemActions } from "../CatalogItemActions";
import {
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import {
  parseSupplierContact,
  type IngredientSupplierLink,
  type SupplierCatalogItem,
  type SupplierListItem,
} from "@/features/procurements/suppliers/types";
import { CatalogLinkForm } from "../CatalogLinkForm";
import { CatalogLinkEntry } from "../CatalogLinkEntry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type SupplierDetail = SupplierListItem & {
  catalog: Array<
    SupplierCatalogItem & {
      links: IngredientSupplierLink[];
    }
  >;
};

type StoreIngredientOption = {
  id: string;
  name: string;
  baseUom: string;
};

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value / 100);
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    const { id } = await params;

    const { data: supplierRow, error: supplierError } = await actor.supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();

    if (supplierError || !supplierRow) {
      throw supplierError ?? new Error("Supplier not found");
    }

    const contact = parseSupplierContact(supplierRow.contact ?? null);

    const supplier: SupplierListItem = {
      id: supplierRow.id,
      name: supplierRow.name,
      is_active: supplierRow.is_active,
      catalogCount: 0,
      contact,
      created_at: supplierRow.created_at,
    };

    const { data: catalogRows, error: catalogError } = await actor.supabase
      .from("supplier_catalog_items")
      .select(
        "*, ingredient_supplier_links ( id, store_ingredient_id, preferred, last_purchase_price, last_purchased_at, store_ingredients(name, base_uom) )",
      )
      .eq("supplier_id", id)
      .order("created_at", { ascending: false });

    if (catalogError) {
      throw catalogError;
    }

    const { data: ingredientRows, error: ingredientsError } = await actor.supabase
      .from("store_ingredients")
      .select("id, name, base_uom, is_active")
      .order("name", { ascending: true });

    if (ingredientsError) {
      throw ingredientsError;
    }

    const storeIngredients: StoreIngredientOption[] = (ingredientRows ?? [])
      .filter((row) => row.is_active)
      .map((row) => ({
        id: row.id,
        name: row.name,
        baseUom: row.base_uom,
      }));

    const catalog =
      catalogRows?.map((row) => {
        const linksData = Array.isArray(row.ingredient_supplier_links)
          ? row.ingredient_supplier_links
          : [];
        const links = linksData.map((link: any) => ({
          id: String(link.id ?? ""),
          storeIngredientId: String(link.store_ingredient_id ?? ""),
          ingredientName: link.store_ingredients?.name ?? "—",
          baseUom: link.store_ingredients?.base_uom ?? null,
          preferred: Boolean(link.preferred),
          lastPurchasePrice:
            typeof link.last_purchase_price === "number"
              ? link.last_purchase_price
              : null,
          lastPurchasedAt: link.last_purchased_at ?? null,
        }));
        return {
          id: row.id,
          supplier_id: row.supplier_id,
          name: row.name,
          base_uom: row.base_uom,
          purchase_price: row.purchase_price,
          is_active: row.is_active,
          created_at: row.created_at,
          links: links.filter((link) => link.id),
        };
      }) ?? [];

    const detail: SupplierDetail = {
      ...supplier,
      catalog,
    };

    const canManage = actor.roles.isAdmin || actor.roles.isManager;

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/procurements/suppliers">Back to suppliers</Link>
            </Button>
            <Badge
              className={
                detail.is_active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : undefined
              }
              variant={detail.is_active ? "default" : "destructive"}
            >
              {detail.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {detail.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Supplier contact and catalog overview.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Name: </span>
                <span>{detail.contact.name ?? "—"}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Email: </span>
                <span>{detail.contact.email ?? "—"}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Phone: </span>
                <span>{detail.contact.phone ?? "—"}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Address: </span>
                <span>{detail.contact.address ?? "—"}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Notes: </span>
                <span>{detail.contact.note ?? "—"}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">
                  Catalog items:{" "}
                </span>
                <span>{detail.catalog.length}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">
                  Created at:{" "}
                </span>
                <span>
                  {detail.created_at
                    ? new Date(detail.created_at).toLocaleString("id-ID")
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Catalog & Ingredient Links</CardTitle>
              <Badge variant="secondary">{detail.catalog.length} items</Badge>
            </div>
            {canManage ? (
              <CatalogCreateForm supplierId={detail.id} />
            ) : null}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Base UOM</TableHead>
                  <TableHead>Purchase Price</TableHead>
                  <TableHead>Linked Ingredients</TableHead>
                  {canManage ? <TableHead className="w-[180px]">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.catalog.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      This supplier has no catalog items yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  detail.catalog.map((item) => {
                    const existingIngredientIds = new Set(
                      item.links?.map((link) => link.storeIngredientId) ?? [],
                    );
                    const statusBadge = item.is_active ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    );

                    return (
                      <TableRow key={item.id} className={!item.is_active ? "opacity-60" : undefined}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">
                              {item.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Added{" "}
                              {new Date(item.created_at).toLocaleDateString("id-ID")}
                            </span>
                            {statusBadge}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.base_uom}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatIDR(item.purchase_price)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-3">
                            {item.links.length === 0 ? (
                              <span className="text-sm text-muted-foreground">
                                No ingredient links
                              </span>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {item.links.map((link) => (
                                  <CatalogLinkEntry
                                    key={link.id}
                                    supplierId={detail.id}
                                    link={link}
                                  />
                                ))}
                              </div>
                            )}
                            {canManage ? (
                              <CatalogLinkForm
                                supplierId={detail.id}
                                catalogItemId={item.id}
                                ingredients={storeIngredients}
                                existingIngredientIds={existingIngredientIds}
                              />
                            ) : null}
                          </div>
                        </TableCell>
                        {canManage ? (
                          <TableCell>
                            <CatalogItemActions supplierId={detail.id} item={item} />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("[SUPPLIER_DETAIL_PAGE_ERROR]", error);
    redirect("/dashboard/procurements/suppliers");
  }
}
