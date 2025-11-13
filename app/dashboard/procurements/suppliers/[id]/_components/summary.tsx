"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SupplierDetailStats } from "@/features/procurements/suppliers/types";
import { formatCurrency } from "@/lib/utils/formatters";

type SupplierSummaryProps = {
  name: string;
  isActive: boolean;
  stats: SupplierDetailStats;
};

export function SupplierSummary({ name, isActive, stats }: SupplierSummaryProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/procurements/suppliers">Back to suppliers</Link>
          </Button>
          <Badge
            variant={isActive ? "secondary" : "destructive"}
            className="uppercase tracking-wide"
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          Supplier detail & purchase insights
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="text-sm text-muted-foreground">
          Monitor purchase orders, outstanding items, dan katalog bahan supplier ini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Purchase Orders"
          value={stats.totalPurchaseOrders.toLocaleString("id-ID")}
          caption="Semua status"
        />
        <MetricCard
          label="Pending Orders"
          value={stats.pendingPurchaseOrders.toLocaleString("id-ID")}
          caption="Draft + Pending"
        />
        <MetricCard
          label="Total Spend"
          value={formatCurrency(stats.totalSpend / 100)}
          caption="Akumulasi nilai PO"
        />
        <MetricCard
          label="Active Catalog Items"
          value={stats.activeCatalogItems.toLocaleString("id-ID")}
          caption="Item siap dibeli"
        />
      </div>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  caption?: string;
};

function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {caption ? (
          <p className="text-xs text-muted-foreground">{caption}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
