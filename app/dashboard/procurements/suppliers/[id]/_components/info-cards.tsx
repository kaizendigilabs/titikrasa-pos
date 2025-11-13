"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  SupplierContact,
  SupplierOrder,
} from "@/features/procurements/suppliers/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";

type InfoCardsProps = {
  contact: SupplierContact;
  createdAt: string;
  supplierId: string;
  recentOrders: SupplierOrder[];
};

export function SupplierInfoCards({
  contact,
  createdAt,
  supplierId,
  recentOrders,
}: InfoCardsProps) {
  const recent = recentOrders.slice(0, 3);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Kontak Supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="PIC" value={contact.name} />
          <InfoRow label="Email" value={contact.email} />
          <InfoRow label="Phone" value={contact.phone} />
          <InfoRow label="Alamat" value={contact.address} />
          <InfoRow label="Catatan" value={contact.note} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Operational</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="Bergabung sejak" value={formatDateTime(createdAt)} />
          <InfoRow
            label="Status pembayaran"
            value="Menunggu integrasi terms (coming soon)"
          />
          <InfoRow
            label="Catatan internal"
            value="Kelola catatan negosiasi & SLA pada audit log."
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ringkasan PO terbaru dari supplier ini.
            </p>
          </div>
          <Button asChild variant="link" className="px-0 text-xs">
            <Link href={`/dashboard/procurements/suppliers/${supplierId}/transactions`}>
              Lihat semua
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {recent.length === 0 ? (
            <p className="text-muted-foreground">
              Belum ada transaksi tercatat. Mulai buat PO pertama.
            </p>
          ) : (
            recent.map((order) => (
              <div key={order.id} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDateTime(order.issuedAt ?? order.completedAt ?? new Date())}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(order.totalAmount / 100)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
        {label}
      </span>
      <span className="text-sm text-foreground">{value ?? "—"}</span>
    </div>
  );
}
