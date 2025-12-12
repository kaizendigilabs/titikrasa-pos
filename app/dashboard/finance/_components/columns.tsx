"use client";

import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { CashFlow } from "@/features/finance/types";
import { FinanceTableRowActions } from "./row-actions";

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
          <span>{row.original.categoryName}</span>
          {isSystem ? (
            <Badge variant="outline" className="text-xs">
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
       return <span className="max-w-[300px] truncate block" title={desc}>{desc}</span>;
    },
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Nominal</div>,
    cell: ({ row }) => {
      const amount = row.original.amount;
      const type = row.original.categoryType;
      const color = type === "in" ? "text-green-600" : "text-red-600";
      const prefix = type === "in" ? "+" : "-";
      
      return (
        <div className={`text-right font-medium ${color}`}>
          {prefix} Rp {amount.toLocaleString("id-ID")}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <FinanceTableRowActions row={row.original} />,
  },
];
