import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";

type SummaryProps = {
  name: string;
  isActive: boolean;
  stats: {
    totalOrders: number;
    unpaidCount: number;
    totalOutstanding: number;
  };
};

export function ResellerSummary({ name, isActive, stats }: SummaryProps) {
  const formattedOutstanding = formatCurrency(stats.totalOutstanding / 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/resellers">Back to resellers</Link>
            </Button>
            <Badge
              variant={isActive ? "secondary" : "destructive"}
              className="capitalize"
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan hubungan reseller, status pembayaran, dan katalog bahan.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">
              Seluruh order channel reseller
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unpaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.unpaidCount}</p>
            <p className="text-xs text-muted-foreground">Invoice belum lunas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formattedOutstanding}</p>
            <p className="text-xs text-muted-foreground">Total piutang aktif</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
