import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import { mapCatalogLinkRow, mapCatalogRow, mapSupplierRow } from "@/features/procurements/suppliers/data/dto";
import type {
  IngredientSupplierLink,
  SupplierCatalogItem,
  SupplierListItem,
} from "@/features/procurements/suppliers/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type SupplierDetail = SupplierListItem & {
  catalog: Array<
    SupplierCatalogItem & {
      links: IngredientSupplierLink[];
    }
  >;
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

    const supplier = mapSupplierRow(supplierRow as any);

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

    const catalog =
      catalogRows?.map((row) => {
        const mapped = mapCatalogRow(row as any);
        const linksData = Array.isArray(row.ingredient_supplier_links)
          ? row.ingredient_supplier_links
          : [];
        const links = linksData.map((link: any) => mapCatalogLinkRow(link));
        return { ...mapped, links };
      }) ?? [];

    const detail: SupplierDetail = {
      ...supplier,
      catalog,
    };

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/procurements/suppliers">Kembali</Link>
            </Button>
            <Badge variant={detail.is_active ? "default" : "destructive"}>
              {detail.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <p className="text-sm text-muted-foreground">
              Rangkuman profil pemasok dan item katalog yang terhubung ke inventory.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Informasi kontak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Nama kontak</p>
                <p className="font-medium text-foreground">{detail.contact.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{detail.contact.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telepon</p>
                <p className="font-medium text-foreground">{detail.contact.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Alamat</p>
                <p className="font-medium text-foreground">{detail.contact.address ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Catatan</p>
                <p className="font-medium text-foreground">{detail.contact.note ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Katalog pembelian</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Kelola item katalog melalui drawer di halaman utama Suppliers untuk pengalaman yang konsisten.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead>Harga beli</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Linked ingredients</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.catalog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          Belum ada item katalog. Gunakan tombol &quot;Kelola katalog&quot; pada halaman daftar supplier.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detail.catalog.map((item) => (
                        <TableRow key={item.id} className={item.is_active ? "" : "opacity-60"}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Dibuat {new Date(item.created_at).toLocaleDateString("id-ID")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.base_uom}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatIDR(item.purchase_price)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? "default" : "destructive"}>
                              {item.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-y-2 text-xs text-muted-foreground">
                            {item.links && item.links.length > 0 ? (
                              item.links.map((link) => (
                                <div key={link.id} className="rounded-md border px-2 py-1">
                                  <p className="font-medium text-foreground">{link.ingredientName}</p>
                                  <p>
                                    {link.baseUom ?? "—"} • {link.preferred ? "Preferred supplier" : "Sekunder"}
                                  </p>
                                  {link.lastPurchasePrice ? (
                                    <p>
                                      Terakhir beli: {formatIDR(link.lastPurchasePrice)} •{' '}
                                      {link.lastPurchasedAt
                                        ? new Date(link.lastPurchasedAt).toLocaleDateString("id-ID")
                                        : "—"}
                                    </p>
                                  ) : null}
                                </div>
                              ))
                            ) : (
                              <span>Tidak ada relasi ingredient</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error("[SUPPLIER_DETAIL_ERROR]", error);
    redirect("/dashboard/procurements/suppliers");
  }
}
