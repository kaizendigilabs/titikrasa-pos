"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  IconMinus,
  IconPlus,
  IconShoppingCart,
  IconSearch,
  IconTrash,
  IconFileInvoice,
  IconRefresh,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import type { MenuListItem, MenuVariantsConfig, MenuSize, MenuTemperature } from "@/features/menus/types";
import type { ResellerListItem } from "@/features/resellers/types";
import type { OrderListItem, OrderFilters } from "@/features/orders/types";
import type { CreateOrderInput, OrderItemInput } from "@/features/orders/schemas";
import {
  useCreateOrderMutation,
  useOrders,
  useOrdersRealtime,
} from "@/features/orders/hooks";

type OrdersQueryData = {
  items: OrderListItem[];
  meta: Record<string, unknown> | null;
};

type PosScreenProps = {
  initialMenus: MenuListItem[];
  initialResellers: ResellerListItem[];
  initialOrderData: OrdersQueryData;
  defaultTaxRate: number;
};

type CartLine = {
  lineId: string;
  menuId: string;
  menuName: string;
  thumbnailUrl: string | null;
  variantKey: string | null;
  variantLabel: string | null;
  size: MenuSize | null;
  temperature: MenuTemperature | null;
  qty: number;
  unitPrice: number;
  channel: "retail" | "reseller";
};

type VariantOption = {
  key: string;
  size: MenuSize;
  temperature: MenuTemperature;
  price: number;
  label: string;
};

const MODE_OPTIONS = [
  { value: "customer" as const, label: "Customer" },
  { value: "reseller" as const, label: "Reseller" },
];

const PAYMENT_METHOD_OPTIONS: CreateOrderInput["paymentMethod"][] = [
  "cash",
  "transfer",
];

const PAYMENT_STATUS_OPTIONS: CreateOrderInput["paymentStatus"][] = [
  "paid",
  "unpaid",
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "amount" as const, label: "Nominal" },
  { value: "percent" as const, label: "Persen" },
];

export function PosScreen({
  initialMenus,
  initialResellers,
  initialOrderData,
  defaultTaxRate,
}: PosScreenProps) {
  const [mode, setMode] = useState<"customer" | "reseller">("customer");
  const [selectedResellerId, setSelectedResellerId] = useState<string | null>(
    initialResellers[0]?.id ?? null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<CreateOrderInput["discount"]["type"]>("amount");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<CreateOrderInput["paymentMethod"]>("cash");
  const [paymentStatus, setPaymentStatus] = useState<CreateOrderInput["paymentStatus"]>("paid");
  const [dueDate, setDueDate] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [bypassServed, setBypassServed] = useState<boolean>(false);
  const [variantModal, setVariantModal] = useState<{
    menu: MenuListItem;
    options: VariantOption[];
  } | null>(null);

  const orderFilters: OrderFilters = useMemo(
    () => ({ channel: "all", status: "open", paymentStatus: "all", limit: 20 }),
    [],
  );

  const ordersQuery = useOrders(orderFilters, { initialData: initialOrderData });
  useOrdersRealtime(orderFilters, { enabled: true });

  const createOrderMutation = useCreateOrderMutation(orderFilters);

  const taxRate = defaultTaxRate;

  const filteredMenus = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return initialMenus;
    return initialMenus.filter((menu) => {
      return (
        menu.name.toLowerCase().includes(term) ||
        (menu.sku?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [initialMenus, searchTerm]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
    [cart],
  );

  const discountAmount = useMemo(() => {
    if (discountType === "amount") {
      return Math.min(discountValue, subtotal);
    }
    return Math.round((discountValue / 100) * subtotal);
  }, [discountType, discountValue, subtotal]);

  const netTotal = Math.max(subtotal - discountAmount, 0);
  const tax = Math.round(netTotal * taxRate);
  const grandTotal = netTotal + tax;

  const modeChannel = mode === "reseller" ? "reseller" : "pos";

  const canSubmit =
    cart.length > 0 &&
    (mode === "customer" || (mode === "reseller" && selectedResellerId));

  const handleAddMenu = (menu: MenuListItem) => {
    if (mode === "reseller" && !hasResellerPrice(menu)) {
      toast.error(`${menu.name} belum memiliki harga reseller aktif`);
      return;
    }

    if (!menu.variants) {
      const price = resolveMenuPrice(menu, modeChannel, null, null);
      if (price == null) {
        toast.error("Harga menu tidak ditemukan");
        return;
      }
      setCart((prev) => {
        const existingIndex = prev.findIndex(
          (line) => line.menuId === menu.id && line.variantKey === null,
        );
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            qty: next[existingIndex].qty + 1,
          };
          return next;
        }
        return [
          ...prev,
          {
            lineId: crypto.randomUUID(),
            menuId: menu.id,
            menuName: menu.name,
            thumbnailUrl: menu.thumbnail_url ?? menu.category_icon_url ?? null,
            variantKey: null,
            variantLabel: null,
            size: null,
            temperature: null,
            qty: 1,
            unitPrice: price,
            channel: modeChannel === "reseller" ? "reseller" : "retail",
          },
        ];
      });
      return;
    }

    const options = listVariantOptions(menu.variants, menu, modeChannel);
    if (options.length === 0) {
      toast.error("Semua varian belum memiliki harga untuk channel ini");
      return;
    }
    setVariantModal({ menu, options });
  };

  const handleConfirmVariant = (option: VariantOption, menu: MenuListItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (line) => line.menuId === menu.id && line.variantKey === option.key,
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          qty: next[existingIndex].qty + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          lineId: crypto.randomUUID(),
          menuId: menu.id,
          menuName: menu.name,
          thumbnailUrl: menu.thumbnail_url ?? menu.category_icon_url ?? null,
          variantKey: option.key,
          variantLabel: option.label,
          size: option.size,
          temperature: option.temperature,
          qty: 1,
          unitPrice: option.price,
          channel: modeChannel === "reseller" ? "reseller" : "retail",
        },
      ];
    });
    setVariantModal(null);
  };

  const updateQuantity = (lineId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((line) =>
          line.lineId === lineId
            ? { ...line, qty: Math.max(1, qty) }
            : line,
        )
        .filter((line) => line.qty > 0),
    );
  };

  const removeLine = (lineId: string) => {
    setCart((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const resetCart = () => {
    setCart([]);
    setDiscountValue(0);
    setDiscountType("amount");
    setNote("");
    setCustomerName("");
    setAmountReceived(0);
    setBypassServed(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const orderItems: OrderItemInput[] = cart.map((line) => ({
      menuId: line.menuId,
      menuName: line.menuName,
      menuSku: null,
      thumbnailUrl: line.thumbnailUrl,
      variant: line.variantKey,
      size: line.size,
      temperature: line.temperature,
      qty: line.qty,
      unitPrice: line.unitPrice,
      discount: 0,
      tax: 0,
    }));

    const input: CreateOrderInput = {
      channel: modeChannel,
      resellerId: mode === "reseller" ? selectedResellerId : null,
      paymentMethod,
      paymentStatus,
      dueDate:
        mode === "reseller" && paymentStatus === "unpaid"
          ? dueDate || null
          : null,
      note,
      customerName,
      items: orderItems,
      discount: {
        type: discountType,
        value: discountValue,
      },
      taxRate,
      bypassServed,
      amountReceived: paymentMethod === "cash" ? amountReceived : null,
    };

    try {
      await createOrderMutation.mutateAsync(input);
      toast.success("Transaksi berhasil");
      resetCart();
    } catch (error) {
      console.error("[POS_CREATE_ORDER_ERROR]", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memproses transaksi",
      );
    }
  };

  const isSubmitting = createOrderMutation.isPending;
  const totalItems = useMemo(() => cart.reduce((sum, line) => sum + line.qty, 0), [cart]);
  const outstandingOrders = ordersQuery.data?.items ?? [];
  const isResellerMode = mode === "reseller";

  const defaultPricePreview = (menu: MenuListItem) => {
    const price = resolveMenuPrice(
      menu,
      modeChannel,
      menu.variants?.default_size ?? null,
      menu.variants?.default_temperature ?? null,
    );
    return formatCurrency(price);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border bg-gradient-to-r from-primary/5 via-background to-background px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select
              value={mode}
              onValueChange={(value) => {
                setMode(value as typeof mode);
                setPaymentStatus("paid");
              }}
            >
              <SelectTrigger className="w-[180px] rounded-xl bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isResellerMode ? (
              <Select
                value={selectedResellerId ?? undefined}
                onValueChange={(value) => setSelectedResellerId(value)}
              >
                <SelectTrigger className="w-[240px] rounded-xl bg-background/80">
                  <SelectValue placeholder="Pilih reseller aktif" />
                </SelectTrigger>
                <SelectContent>
                  {initialResellers.map((reseller) => (
                    <SelectItem key={reseller.id} value={reseller.id}>
                      {reseller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari menu, SKU atau kategori"
                className="h-11 w-72 rounded-xl border-muted-foreground/20 bg-background/90 pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border"
              onClick={() => ordersQuery.refetch()}
              disabled={ordersQuery.isFetching}
              aria-label="Refresh orders"
            >
              <IconRefresh className={`h-4 w-4 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline" className="rounded-full px-4 py-1 text-xs uppercase tracking-wide">
            Mode · {isResellerMode ? "Reseller" : "Customer"}
          </Badge>
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Keranjang · {totalItems} item{totalItems === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 py-1">
            Total · {formatCurrency(grandTotal)}
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 py-1">
            Diskon · {discountType === "amount" ? formatCurrency(discountAmount) : `${discountValue}%`}
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 py-1">
            Orders Aktif · {outstandingOrders.length}
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[3fr,1.4fr]">
        <section className="space-y-4 rounded-2xl border bg-background/70 p-4 shadow-sm">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Daftar Menu</h2>
              <p className="text-sm text-muted-foreground">Tap untuk menambahkan ke keranjang. Harga menyesuaikan channel aktif.</p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {filteredMenus.length} menu
            </Badge>
          </header>

          <div className="max-h-[640px] overflow-y-auto pr-1">
            {filteredMenus.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                Menu tidak ditemukan untuk kata kunci tersebut.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredMenus.map((menu) => (
                  <button
                    key={menu.id}
                    type="button"
                    className="group flex h-full flex-col justify-between rounded-2xl border border-transparent bg-card/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
                    onClick={() => handleAddMenu(menu)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-base font-semibold text-foreground group-hover:text-primary">
                          {menu.name}
                        </span>
                        {menu.category_name ? (
                          <span className="text-xs text-muted-foreground">
                            {menu.category_name}
                          </span>
                        ) : null}
                        {menu.sku ? (
                          <span className="text-xs text-muted-foreground">SKU · {menu.sku}</span>
                        ) : null}
                      </div>
                      <Badge variant={menu.variants ? "outline" : "secondary"} className="rounded-full">
                        {menu.variants ? "Variant" : "Single"}
                      </Badge>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1 font-medium text-foreground">
                        {defaultPricePreview(menu)}
                      </span>
                      {menu.variants ? (
                        <span className="text-xs uppercase tracking-wide text-primary">Pilih Varian</span>
                      ) : (
                        <span className="text-xs uppercase tracking-wide">Harga standar</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="space-y-4 rounded-2xl border bg-background/70 p-4 shadow-sm">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <IconShoppingCart className="h-5 w-5 text-primary" />
                Keranjang Aktif
              </div>
              {cart.length > 0 ? (
                <Button variant="ghost" size="sm" className="rounded-full" onClick={resetCart}>
                  Bersihkan
                </Button>
              ) : null}
            </header>

            {cart.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
                <p>Keranjang masih kosong.</p>
                <p>Tambah menu dari daftar di sebelah kiri.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((line) => (
                  <div
                    key={line.lineId}
                    className="flex flex-col gap-3 rounded-2xl border border-muted-foreground/20 bg-card/80 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {line.menuName}
                        </p>
                        {line.variantLabel ? (
                          <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
                        ) : null}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatCurrency(line.unitPrice)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => removeLine(line.lineId)}
                        aria-label="Hapus item"
                      >
                        <IconTrash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border bg-background/60 px-3 py-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Qty</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(line.lineId, line.qty - 1)}
                        >
                          <IconMinus className="h-4 w-4" />
                        </Button>
                        <Input
                          className="h-8 w-16 rounded-full border-muted-foreground/20 text-center"
                          type="number"
                          min={1}
                          value={line.qty}
                          onChange={(event) =>
                            updateQuantity(line.lineId, Number(event.target.value) || 1)
                          }
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(line.lineId, line.qty + 1)}
                        >
                          <IconPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border bg-background/70 p-4 shadow-sm">
            <header>
              <h3 className="text-lg font-semibold tracking-tight">Detail Pembayaran</h3>
              <p className="text-sm text-muted-foreground">Atur pembayaran, diskon, dan opsi tiket.</p>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as CreateOrderInput["paymentMethod"])}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "cash" ? "Cash" : "Transfer"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status Pembayaran</Label>
                <Select
                  value={paymentStatus}
                  onValueChange={(value) => setPaymentStatus(value as CreateOrderInput["paymentStatus"])}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.filter((option) =>
                      mode === "customer" ? option !== "unpaid" : true,
                    ).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "paid" ? "Paid" : "Unpaid"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isResellerMode && paymentStatus === "unpaid" ? (
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Diskon Transaksi</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={discountType}
                    onValueChange={(value) => setDiscountType(value as typeof discountType)}
                  >
                    <SelectTrigger className="h-11 w-[140px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 rounded-xl"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(Math.max(0, Number(event.target.value) || 0))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nama Pelanggan</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Opsional"
                />
              </div>
            </div>

            {paymentMethod === "cash" ? (
              <div className="space-y-2">
                <Label>Uang Diterima</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-11 rounded-xl"
                  value={amountReceived}
                  onChange={(event) => setAmountReceived(Math.max(0, Number(event.target.value) || 0))}
                />
                <p className="text-xs text-muted-foreground">
                  Kembalian · {formatCurrency(Math.max(amountReceived - grandTotal, 0))}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Catatan untuk Barista / KDS</Label>
              <Input
                className="h-11 rounded-xl"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Opsional"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-muted-foreground/20 bg-background/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Bypass status <span className="font-mono text-primary">served</span>
                </p>
                <p className="text-xs text-muted-foreground">Langsung tandai tiket selesai tanpa antrean KDS.</p>
              </div>
              <Switch checked={bypassServed} onCheckedChange={setBypassServed} aria-label="Bypass served" />
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Diskon</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax 11%</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-lg font-semibold text-foreground">
                <span>Total Pembayaran</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <Button
              className="h-12 w-full rounded-xl text-base font-semibold"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              <IconFileInvoice className="mr-2 h-4 w-4" />
              {isSubmitting ? "Memproses order..." : "Selesaikan Order"}
            </Button>
          </section>

          <section className="rounded-2xl border bg-background/70 p-4 shadow-sm">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Order Terbaru</h3>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {outstandingOrders.length}
              </Badge>
            </header>

            <div className="mt-3 max-h-[260px] space-y-3 overflow-y-auto pr-1 text-sm">
              {outstandingOrders.length === 0 ? (
                <p className="text-muted-foreground">Belum ada order terbaru dari kanal ini.</p>
              ) : (
                outstandingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-1 rounded-2xl border border-muted-foreground/20 bg-card/80 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{order.number}</span>
                      <Badge
                        variant={order.paymentStatus === "paid" ? "secondary" : "outline"}
                        className="rounded-full"
                      >
                        {order.paymentStatus.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.items.length} item · {formatCurrency(order.totals.grand)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <Dialog open={variantModal !== null} onOpenChange={(open) => (!open ? setVariantModal(null) : undefined)}>
        <DialogContent className="max-w-md">
          {variantModal ? (
            <>
              <DialogHeader>
                <DialogTitle>Pilih Varian</DialogTitle>
                <DialogDescription>
                  Tentukan kombinasi ukuran & temperature untuk {variantModal.menu.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {variantModal.options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:border-primary"
                    onClick={() => handleConfirmVariant(option, variantModal.menu)}
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{option.label}</p>
                    </div>
                    <span className="text-sm text-foreground">
                      {option.price != null ? formatCurrency(option.price) : "N/A"}
                    </span>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVariantModal(null)}>
                  Batal
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function resolveMenuPrice(
  menu: MenuListItem,
  channel: "pos" | "reseller",
  size: MenuSize | null,
  temperature: MenuTemperature | null,
) {
  if (!menu.variants) {
    return channel === "reseller" ? menu.reseller_price ?? null : menu.price ?? null;
  }
  const priceMap = menu.variants.prices[channel === "reseller" ? "reseller" : "retail"];
  if (!size || !temperature) {
    const defaultSize = menu.variants.default_size;
    const defaultTemp = menu.variants.default_temperature;
    if (!defaultSize || !defaultTemp) return null;
    return priceMap?.[defaultSize]?.[defaultTemp] ?? null;
  }
  return priceMap?.[size]?.[temperature] ?? null;
}

function listVariantOptions(
  variants: MenuVariantsConfig,
  menu: MenuListItem,
  channel: "pos" | "reseller",
): VariantOption[] {
  const options: VariantOption[] = [];
  for (const size of variants.allowed_sizes) {
    for (const temp of variants.allowed_temperatures) {
      const key = `${size}|${temp}`;
      const price = resolveMenuPrice(menu, channel, size, temp);
      if (price == null) continue;
      const label = `${size.toUpperCase()} · ${temp.toUpperCase()}`;
      options.push({ key, size, temperature: temp, price, label });
    }
  }
  return options.filter((option) => option.price > 0);
}

function hasResellerPrice(menu: MenuListItem) {
  if (!menu.variants) {
    return typeof menu.reseller_price === "number" && menu.reseller_price > 0;
  }
  for (const size of menu.variants.allowed_sizes) {
    for (const temp of menu.variants.allowed_temperatures) {
      const price = menu.variants.prices.reseller?.[size]?.[temp];
      if (price != null && price > 0) return true;
    }
  }
  return false;
}

function formatCurrency(value: number | null | undefined) {
  const amount = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
