"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils/formatters";
import type { UseStockOpnameControllerResult } from "./use-stock-opname";

type StockOpnameTableProps = {
  controller: UseStockOpnameControllerResult;
};

export function StockOpnameTable({ controller }: StockOpnameTableProps) {
  const { form, rows } = controller;

  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <Table>
        <TableHeader className="bg-muted/70">
          <TableRow>
            <TableHead>Ingredient</TableHead>
            <TableHead className="w-28 text-right">System</TableHead>
            <TableHead className="w-32 text-right">Counted</TableHead>
            <TableHead className="w-24 text-right">Delta</TableHead>
            <TableHead className="w-32 text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const status = row.delta === 0 ? "synced" : "out-of-sync";
            return (
              <TableRow key={row.ingredientId}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{row.name}</span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {row.baseUom}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatNumber(row.currentStock, 0)}
                </TableCell>
                <TableCell className="text-right">
                  <form.Field name={`items[${index}].actual`}>
                    {(field: any) => (
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 100"
                        value={(field.state.value as string) ?? ""}
                        onChange={(event) => field.handleChange(event.target.value)}
                        onBlur={field.handleBlur}
                        className="text-right"
                      />
                    )}
                  </form.Field>
                </TableCell>
                <TableCell
                  className={`text-right text-sm ${
                    row.delta === 0 ? "text-muted-foreground" : "text-amber-600"
                  }`}
                >
                  {row.delta === 0 ? "—" : formatNumber(row.delta, 0)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={row.delta === 0 ? "secondary" : "outline"}
                    className={
                      row.delta === 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 text-amber-700"
                    }
                  >
                    {status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
