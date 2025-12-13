"use client";

import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { CashFlow } from "@/features/finance/types";
import { FinanceTableRowActions } from "./row-actions";
import { formatCurrency } from "@/lib/utils/formatters";

export const financeColumns: ColumnDef<CashFlow>[] = [
  {
    accessorKey: "date",
    header: "Tanggal",
    cell: ({ row }) => {
      return format(new Date(row.original.date), "dd MMM yyyy HH:mm", {
        locale: idLocale,
      });
    },
  },
  {
    accessorKey: "categoryName",
    header: "Kategori",
    cell: ({ row }) => {
      const isSystem = row.original.orderId || row.original.purchaseOrderId;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{row.original.categoryName}</span>
          {isSystem ? (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">
              System
            </Badge>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Keterangan",
    cell: ({ row }) => {
       const desc = row.original.description || "-";
       return <span className="max-w-[300px] truncate block text-muted-foreground" title={desc}>{desc}</span>;
    },
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Nominal</div>,
    cell: ({ row }) => {
      const amount = row.original.amount;
      const type = row.original.categoryType;
      const isIncome = type === "in";
      
      return (
        <div className={`text-right font-bold ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
          {isIncome ? "+" : "-"} {formatCurrency(amount)}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <FinanceTableRowActions row={row.original} />,
  },
];
