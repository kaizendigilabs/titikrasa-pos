"use client";

import * as React from "react";
import {
  IconSearch,
  IconStar,
  IconStarFilled,
  IconPlus,
} from "@tabler/icons-react";

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
  const searchPlaceholder = "Search Menu...";
  const categoryChips = React.useMemo(
    () => [
      { id: "all" as const, name: "Semua", count: totalMenuCount },
      ...categoryOptions,
    ],
    [categoryOptions, totalMenuCount]
  );

  return (
    <section className="space-y-5 rounded-3xl border bg-card/90 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Create Transaction
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Order coffee here
          </h2>
        </div>
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
      </header>

      <div className="-mx-6 px-6 overflow-x-auto scrollbar-hide">
        <div className="flex w-max gap-2">
          {categoryChips.map((category) => {
            const isActive = categoryFilter === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  onCategoryFilterChange(
                    category.id === "all" ? "all" : category.id
                  )
                }
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{category.name}</span>
                <span
                  className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <MenuPanelSkeleton />
      ) : menus.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed py-16 text-center text-muted-foreground">
          <IconSearch className="h-10 w-10 opacity-20" />
          <p>Menu tidak ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {menus.map((menu) => {
            const pricePreview =
              resolveMenuPrice(
                menu,
                "pos",
                menu.variants?.default_size ?? null,
                menu.variants?.default_temperature ?? null
              ) ??
              menu.price ??
              0;

            return (
              <div
                key={menu.id}
                className="group relative flex flex-col justify-between gap-3 rounded-3xl bg-card p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer active:scale-95"
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
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-secondary/20 text-secondary-foreground hover:bg-secondary/30"
                    >
                      {menu.category_name ?? "Umum"}
                    </Badge>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-yellow-500 transition-colors"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(menu.id);
                      }}
                    >
                      {favoriteMenuIds.includes(menu.id) ? (
                        <IconStarFilled className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <IconStar className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <div>
                    <h3 className="line-clamp-2 font-semibold leading-tight text-foreground">
                      {menu.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {menu.sku ? `SKU: ${menu.sku}` : "No SKU"}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(pricePreview)}
                  </span>
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-full shadow-sm"
                  >
                    <IconPlus className="h-5 w-5" />
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
