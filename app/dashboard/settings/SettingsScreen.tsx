"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/features/settings/hooks";
import { TaxDiscountForm } from "./_components/tax-discount-form";
import { StoreProfileForm } from "./_components/store-profile-form";
import { ReceiptNumberForm } from "./_components/receipt-number-form";

const TAB_ITEMS = [
  {
    value: "tax",
    label: "Tax & Discount",
    description: "Atur tarif PPN dan diskon default POS",
  },
  {
    value: "store",
    label: "Profil Gerai",
    description: "Informasi toko untuk struk dan dashboard",
  },
  {
    value: "receipt",
    label: "Penomoran Struk",
    description: "Prefix dan format nomor transaksi",
  },
] as const;

export function SettingsScreen() {
  const [tab, setTab] = React.useState<(typeof TAB_ITEMS)[number]["value"]>("tax");
  const settingsQuery = useSettings();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return <SettingsSkeleton />;
  }

  const data = settingsQuery.data;

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Kelola pajak, diskon, dan informasi gerai Titikrasa POS.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as typeof tab)}
          className="flex w-full flex-1 flex-col gap-6 lg:flex-row"
        >
          <TabsList className="grid h-fit w-full gap-2 rounded-2xl bg-transparent p-4 lg:w-64">
            {TAB_ITEMS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="group justify-start rounded-md px-4 py-3 text-left text-sm font-medium text-muted-foreground transition data-[state=active]:bg-primary/5 data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1">
            <TabsContent value="tax" className="m-0">
              <SectionCard
                title="Tax & Discount"
                description="Tarif PPN default dan diskon transaksi di POS."
              >
                <TaxDiscountForm tax={data.tax} discount={data.discount} />
              </SectionCard>
            </TabsContent>
            <TabsContent value="store" className="m-0">
              <SectionCard
                title="Profil Gerai"
                description="Data toko ditampilkan di struk dan modul internal."
              >
                <StoreProfileForm storeProfile={data.storeProfile} />
              </SectionCard>
            </TabsContent>
            <TabsContent value="receipt" className="m-0">
              <SectionCard
                title="Penomoran Struk"
                description="Tentukan prefix, digit, dan reset nomor untuk POS dan reseller."
              >
                <ReceiptNumberForm receiptNumbering={data.receiptNumbering} />
              </SectionCard>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border/40 bg-background/90">
      <div className="space-y-1 border-b border-border/40 px-6 py-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    </div>
  );
}
