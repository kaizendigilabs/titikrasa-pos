"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { useFinanceTableController } from "./use-finance-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowDown, IconArrowUp, IconScale } from "@tabler/icons-react";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { ManageCategoriesDialog } from "./manage-categories-dialog";

export function FinanceTable() {
  const controller = useFinanceTableController();

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      queryHook={controller.queryHook}
      getRowId={(row) => row.id}
      loadingMessage="Memuat data keuangan..."
      emptyMessage="Belum ada transaksi."
      renderToolbar={(context) => {
        // Extract summary from query result
        const summary = (context.queryResult.data as any)?.summary;
        
        return (
          <div className="space-y-4">
            {summary && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pemasukan
                    </CardTitle>
                    <IconArrowUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      Rp {summary.totalIn.toLocaleString("id-ID")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pengeluaran
                    </CardTitle>
                    <IconArrowDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      Rp {summary.totalOut.toLocaleString("id-ID")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Saldo Bersih
                    </CardTitle>
                    <IconScale className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${summary.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                      Rp {summary.net.toLocaleString("id-ID")}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div className="flex items-center justify-between">
                <DataTableToolbar {...controller.buildToolbarConfig(context)} />
                <div className="flex items-center gap-2">
            <ManageCategoriesDialog />
            <AddTransactionDialog />
        </div>
            </div>
          </div>
        );
      }}
    />
  );
}
