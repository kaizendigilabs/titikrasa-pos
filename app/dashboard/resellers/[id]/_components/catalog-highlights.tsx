import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResellerCatalogEntry } from "@/features/resellers/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";

type CatalogHighlightsProps = {
  items: ResellerCatalogEntry[];
};

export function CatalogHighlights({ items }: CatalogHighlightsProps) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Katalog Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Belum ada catatan pembelian reseller ini.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Katalog Terbaru</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.menuId}
            className="flex flex-col gap-1 rounded-md border p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{item.menuName}</span>
              {item.lastPrice != null ? (
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(item.lastPrice / 100)}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.totalQty} pcs total</span>
              <span>
                {item.lastOrderAt ? formatDateTime(item.lastOrderAt) : "Belum ada transaksi"}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
