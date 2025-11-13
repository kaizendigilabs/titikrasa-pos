"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/formatters";

type SummaryHeaderProps = {
  name: string;
  isActive: boolean;
};

export function SummaryHeader({ name, isActive }: SummaryHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <Badge
          variant={isActive ? "secondary" : "outline"}
          className={isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled>
          Edit Ingredient
        </Button>
      </div>
    </div>
  );
}

type InventorySnapshotProps = {
  sku: string | null;
  baseUom: string;
  minStock: number;
  currentStock: number;
  avgCost: number;
};

export function InventorySnapshotCard({
  sku,
  baseUom,
  minStock,
  currentStock,
  avgCost,
}: InventorySnapshotProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Inventory Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <InfoRow label="SKU" value={sku ?? "—"} />
        <InfoRow label="Base UOM" value={baseUom.toUpperCase()} />
        <InfoRow label="Minimum Stock" value={formatNumber(minStock, 0)} />
        <InfoRow
          label="Current Stock"
          value={formatNumber(currentStock, 0)}
          emphasize
        />
        <InfoRow label="Average Cost" value={formatCurrency(avgCost)} />
      </CardContent>
    </Card>
  );
}

type LatestPurchaseProps = {
  supplierId: string | null;
  supplierName: string | null;
  price: number | null;
  purchasedAt: string | null;
  createdAt: string;
};

export function LatestPurchaseCard({
  supplierId,
  supplierName,
  price,
  purchasedAt,
  createdAt,
}: LatestPurchaseProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Latest Purchase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Supplier</span>
          {supplierId ? (
            <Button variant="link" size="sm" asChild>
              <Link href={`/dashboard/procurements/suppliers/${supplierId}`}>
                {supplierName ?? "Unknown supplier"}
              </Link>
            </Button>
          ) : (
            <span>{supplierName ?? "No purchase recorded"}</span>
          )}
        </div>
        <InfoRow
          label="Last Purchase Price"
          value={price !== null ? formatCurrency(price) : "—"}
        />
        <InfoRow
          label="Last Purchase Date"
          value={purchasedAt ? formatDateTime(purchasedAt) : "—"}
        />
        <InfoRow label="Created At" value={formatDateTime(createdAt)} />
      </CardContent>
    </Card>
  );
}

type LinkedSuppliersCardProps = {
  suppliers: Array<{ id: string; name: string }>;
};

export function LinkedSuppliersCard({ suppliers }: LinkedSuppliersCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">
          Linked Suppliers
        </CardTitle>
        <Badge variant="secondary">{suppliers.length} total</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {suppliers.length === 0 ? (
          <p className="text-muted-foreground">
            Belum ada supplier aktif. Hubungkan ingredient ini melalui Purchase
            Orders atau halaman Suppliers.
          </p>
        ) : (
          suppliers.slice(0, 5).map((supplier) => (
            <div
              key={supplier.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="font-medium text-foreground">{supplier.name}</span>
              <Button variant="link" size="sm" asChild>
                <Link href={`/dashboard/procurements/suppliers/${supplier.id}`}>
                  Lihat
                </Link>
              </Button>
            </div>
          ))
        )}
        {suppliers.length > 5 ? (
          <p className="text-xs text-muted-foreground">
            +{suppliers.length - 5} supplier lainnya
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={emphasize ? "font-semibold text-foreground" : undefined}>
        {value}
      </span>
    </div>
  );
}
