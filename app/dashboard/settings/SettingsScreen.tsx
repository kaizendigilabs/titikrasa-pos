"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

import { useSettings } from "@/features/settings/hooks";
import { TaxDiscountForm } from "./_components/tax-discount-form";
import { StoreProfileForm } from "./_components/store-profile-form";
import { ReceiptNumberForm } from "./_components/receipt-number-form";
import { Skeleton } from "@/components/ui/skeleton";

// Menu items
const MENU_ITEMS = [
  {
    id: "tax",
    label: "Tax & Discount",
    description: "Tarif pajak dan diskon default",
  },
  {
    id: "store",
    label: "Profil Gerai",
    description: "Identitas toko & branding",
  },
  {
    id: "receipt",
    label: "Penomoran Struk",
    description: "Format nomor transaksi",
  },
] as const;

export function SettingsScreen() {
  const [activeTab, setActiveTab] = React.useState<string>("tax");
  const settingsQuery = useSettings();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return <SettingsSkeleton />;
  }

  const data = settingsQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Kelola preferensi toko, pajak, dan branding Titikrasa.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Sidebar Navigation */}
        <aside className="no-scrollbar w-full overflow-x-auto lg:sticky lg:top-8 lg:w-64 lg:shrink-0 lg:overflow-visible">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "group flex min-w-[200px] flex-col items-start rounded-xl px-4 py-3 text-left transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                  activeTab === item.id
                    ? "bg-primary/5 text-primary ring-1 ring-primary/10"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="font-semibold">{item.label}</span>
                <span
                  className={cn(
                    "text-xs",
                    activeTab === item.id ? "text-primary/70" : "text-muted-foreground/60",
                  )}
                >
                  {item.description}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-6">
          {activeTab === "tax" && (
            <SectionContainer
              title="Tax & Discount"
              description="Atur tarif PPN default dan diskon yang berlaku di POS."
            >
              <TaxDiscountForm tax={data.tax} discount={data.discount} />
            </SectionContainer>
          )}

          {activeTab === "store" && (
            <SectionContainer
              title="Profil Gerai"
              description="Informasi ini akan ditampilkan pada struk bukti pembayaran."
            >
              <StoreProfileForm storeProfile={data.storeProfile} />
            </SectionContainer>
          )}

          {activeTab === "receipt" && (
            <SectionContainer
              title="Penomoran Struk"
              description="Kustomisasi format nomor transaksi untuk POS dan Reseller."
            >
              <ReceiptNumberForm receiptNumbering={data.receiptNumbering} />
            </SectionContainer>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionContainer({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-border/40 pb-5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[250px,1fr]">
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}


