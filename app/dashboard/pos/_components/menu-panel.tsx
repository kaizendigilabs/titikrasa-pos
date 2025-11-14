"use client";

import * as React from "react";
import { IconSearch, IconStar, IconStarFilled } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { MenuListItem } from "@/features/menus/types";
import { formatCurrency } from "@/lib/utils/formatters";
import { resolveMenuPrice } from "@/features/pos/utils";
import { cn } from "@/lib/utils/cn";

type MenuPanelProps = {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string | "all";
  onCategoryFilterChange: (value: string | "all") => void;
  categoryOptions: Array<{ id: string; name: string; count: number }>;
  totalMenuCount: number;
  menus: MenuListItem[];
  onMenuClick: (menu: MenuListItem) => void;
  favoriteMenuIds: string[];
  onToggleFavorite: (menuId: string) => void;
  isLoading?: boolean;
};

export function MenuPanel({
  searchInputRef,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  totalMenuCount,
  menus,
  onMenuClick,
  favoriteMenuIds,
  onToggleFavorite,
  isLoading = false,
}: MenuPanelProps) {
  const searchPlaceholder = "Cari menu atau SKU";
  const visibleMenuCount = menus.length;
  const categoryChips = React.useMemo(
    () =>
      [
        { id: "all" as const, name: "Semua", count: totalMenuCount },
        ...categoryOptions,
      ],
    [categoryOptions, totalMenuCount],
  );

  return (
    <section className="space-y-5 rounded-3xl border bg-card/90 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Create Transaction
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Pilih menu favorit pelanggan
          </h2>
        </div>
        <Badge variant="outline" className="rounded-full px-4 py-1 text-sm font-medium">
          {totalMenuCount} menu tersedia
        </Badge>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Menampilkan {visibleMenuCount} menu
        </p>
        <div className="relative w-full max-w-xs">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-full border-muted-foreground/30 pl-10"
            placeholder={searchPlaceholder}
            ref={searchInputRef}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoryChips.map((category) => {
          const isActive = categoryFilter === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                onCategoryFilterChange(category.id === "all" ? "all" : category.id)
              }
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent bg-muted/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span>{category.name}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground",
                )}
              >
                {category.count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <MenuPanelSkeleton />
      ) : menus.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Menu tidak ditemukan. Periksa filter kategori atau kata kunci pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {menus.map((menu) => {
            const pricePreview =
              resolveMenuPrice(
                menu,
                "pos",
                menu.variants?.default_size ?? null,
                menu.variants?.default_temperature ?? null,
              ) ?? menu.price ?? 0;

            return (
              <div
                key={menu.id}
                className="group relative flex flex-col gap-4 rounded-3xl border border-muted-foreground/10 bg-card/90 p-5 text-left shadow-sm transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                role="button"
                tabIndex={0}
                onClick={() => onMenuClick(menu)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onMenuClick(menu);
                  }
                }}
              >
                <button
                  type="button"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-background/80 text-muted-foreground shadow-sm transition hover:border-primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(menu.id);
                  }}
                  aria-label="Toggle favorite"
                >
                  {favoriteMenuIds.includes(menu.id) ? (
                    <IconStarFilled className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <IconStar className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-medium">
                    {menu.category_name ?? "General"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px]">
                    {menu.variants ? "Varian" : "Single"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">
                    {menu.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {menu.sku ? `SKU ${menu.sku}` : menu.category_name ?? "Menu favorit pelanggan"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lg font-semibold text-foreground">
                    {formatCurrency(pricePreview)}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {menu.variants ? "Pilih Varian" : "Harga standar"}
                  </span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="w-full rounded-full text-sm font-semibold">
                    Tambah ke keranjang
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MenuPanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-2xl border border-muted-foreground/20 bg-muted/30 p-4"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
