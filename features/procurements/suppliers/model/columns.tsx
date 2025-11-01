'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { IconDotsVertical, IconLoader2 } from '@tabler/icons-react';
import Link from 'next/link';

import { DataTableColumnHeader } from '@/components/data-table/column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SupplierListItem } from '../types';

export type SupplierRowPendingState = Record<string, 'toggle' | 'delete' | 'update' | 'catalog'>;

export type SupplierColumnHandlers = {
  canManage: boolean;
  pendingActions: SupplierRowPendingState;
  onEdit: (supplier: SupplierListItem) => void;
  onToggleStatus: (supplier: SupplierListItem) => void;
  onDelete: (supplier: SupplierListItem) => void;
  onManageCatalog: (supplier: SupplierListItem) => void;
};

export function createSupplierColumns({
  canManage,
  pendingActions,
  onEdit,
  onToggleStatus,
  onDelete,
  onManageCatalog,
}: SupplierColumnHandlers): ColumnDef<SupplierListItem>[] {
  const columns: ColumnDef<SupplierListItem>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Pilih baris"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
      maxSize: 48,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <div className="flex flex-col gap-1">
            <Link
              href={`/dashboard/procurements/suppliers/${supplier.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {supplier.name}
            </Link>
            <div className="text-xs text-muted-foreground">
              {supplier.contact.email ?? '—'}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'contact.phone',
      header: 'Kontak',
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>{row.original.contact.phone ?? '—'}</div>
          {row.original.contact.address ? (
            <div className="truncate text-[11px] opacity-80">
              {row.original.contact.address}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'catalogCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Item katalog" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">
          {row.original.catalogCount}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Aktif
          </Badge>
        ) : (
          <Badge variant="outline" className="border-destructive text-destructive">
            Nonaktif
          </Badge>
        ),
    },
  ];

  if (!canManage) {
    return columns;
  }

  columns.push({
    id: 'actions',
    cell: ({ row }) => {
      const supplier = row.original;
      const pending = pendingActions[supplier.id] ?? null;
      const disabled = Boolean(pending);
      const toggleLabel = supplier.is_active ? 'Nonaktifkan' : 'Aktifkan';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={disabled}>
              <span className="sr-only">Buka menu</span>
              {disabled ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconDotsVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Aksi Supplier</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(supplier)} disabled={disabled}>
              Edit profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageCatalog(supplier)} disabled={disabled}>
              Kelola katalog
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggleStatus(supplier)} disabled={disabled}>
              {pending === 'toggle' ? (
                <span className="flex items-center gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Memperbarui…
                </span>
              ) : (
                toggleLabel
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(supplier)}
              disabled={disabled}
              className="text-destructive focus:text-destructive"
            >
              {pending === 'delete' ? (
                <span className="flex items-center gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Menghapus…
                </span>
              ) : (
                'Hapus supplier'
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 64,
    maxSize: 64,
    enableSorting: false,
    enableHiding: false,
  });

  return columns;
}
