import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResellerContact, ResellerTerms } from "@/features/resellers/types";

type InfoCardsProps = {
  contact: ResellerContact;
  terms: ResellerTerms;
};

export function ResellerInfoCards({ contact, terms }: InfoCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Kontak</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <InfoRow label="PIC Email" value={contact.email} />
          <InfoRow label="PIC Phone" value={contact.phone} />
          <InfoRow label="Alamat" value={contact.address} />
          <InfoRow label="Catatan" value={contact.note} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payment Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <InfoRow
            label="Payment Term (hari)"
            value={
              typeof terms.paymentTermDays === "number"
                ? `${terms.paymentTermDays} hari`
                : null
            }
          />
          <InfoRow
            label="Diskon Reseller"
            value={
              typeof terms.discountPercent === "number"
                ? `${terms.discountPercent}%`
                : null
            }
          />
          <InfoRow
            label="Preferensi"
            value={
              contact.note ??
              "Belum ada preferensi pengiriman / pembayaran yang disimpan."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      <span className="text-sm text-foreground">{value ?? "—"}</span>
    </div>
  );
}
