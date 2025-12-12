"use client";

import * as React from "react";
import {
  useForm,
  type ReactFormExtendedApi,
  useStore as useFormStore,
} from "@tanstack/react-form";
import { toast } from "sonner";
import { useStore } from "@/lib/store/simple-store";

import type { MenuListItem } from "@/features/menus/types";
import type { ResellerListItem } from "@/features/resellers/types";

import type { CreateOrderInput } from "@/features/orders/schemas";
import {
  useCreateOrderMutation,
  useOrders,
} from "@/features/orders/hooks";
import { DEFAULT_POS_ORDER_FILTERS } from "@/features/pos/keys";
import {
  cartStore,
  hydrateCartStore,
  addCartLine,
  updateCartQuantity,
  removeCartLine,
  clearCart,
  patchCart,
  createOrderItems,
  getDefaultCartState,
  type CartState,
} from "@/features/pos/cart-store";
import {
  listVariantOptions,
  resolveMenuPrice,
  hasResellerPrice,
  type VariantOption,
} from "@/features/pos/utils";
import {
  preferencesStore,
  hydratePreferencesStore,
  toggleFavoriteMenu,
  recordRecentReseller,
} from "@/features/pos/preferences-store";



export type PaymentFormValues = {
  paymentMethod: CreateOrderInput["paymentMethod"];
  paymentStatus: CreateOrderInput["paymentStatus"];
  dueDate: string;
  amountReceived: number;
  note: string;
  customerName: string;
};

export type PaymentFormApi = ReactFormExtendedApi<
  PaymentFormValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;

export type UsePosControllerProps = {
  menus: MenuListItem[];
  resellers: ResellerListItem[];
  defaultTaxRate: number;
};

export type VariantDialogState = {
  menu: MenuListItem;
  options: VariantOption[];
};

export function usePosController({
  menus,
  resellers,
  defaultTaxRate,
}: UsePosControllerProps) {
  const [mode, setMode] = React.useState<"customer" | "reseller">("customer");
  const [selectedResellerId, setSelectedResellerId] = React.useState<string | null>(
    resellers[0]?.id ?? null,
  );
  const [resellerQuery, setResellerQuery] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string | "all">("all");
  const [variantDialog, setVariantDialog] =
    React.useState<VariantDialogState | null>(null);
  const [paymentDrawerOpen, setPaymentDrawerOpen] = React.useState(false);
  const cartState = useStore(cartStore, (state) => state);
  const preferences = useStore(preferencesStore, (state) => state);

  const resellerMap = React.useMemo(() => {
    const map = new Map<string, string>();
    resellers.forEach((reseller) => {
      map.set(reseller.id, reseller.name);
    });
    return map;
  }, [resellers]);

  React.useEffect(() => {
    if (mode !== "reseller") {
      setResellerQuery("");
      return;
    }
    if (!selectedResellerId) return;
    const match = resellers.find((reseller) => reseller.id === selectedResellerId);
    if (match) {
      setResellerQuery((current) => (current === match.name ? current : match.name));
    }
  }, [mode, selectedResellerId, resellers]);

  const hasHydratedRef = React.useRef(false);
  const [hasHydrated, setHasHydrated] = React.useState(false);

  React.useEffect(() => {
    if (hasHydratedRef.current) return;
    hydrateCartStore();
    hydratePreferencesStore();
    hasHydratedRef.current = true;
    setHasHydrated(true);
  }, []);

  const orderFilters = DEFAULT_POS_ORDER_FILTERS;
  const ordersQuery = useOrders(orderFilters);


  const getResellerName = React.useCallback(
    (id: string) => resellerMap.get(id),
    [resellerMap],
  );

  const createOrderMutation = useCreateOrderMutation(orderFilters, {
    getResellerName,
  });

  type PaymentFormApiType = ReactFormExtendedApi<
    PaymentFormValues,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >;
  const paymentForm = useForm({
    defaultValues: mapCartToPaymentValues(getDefaultCartState()),
    onSubmit: async ({ value }) => {
      await submitOrder(value);
    },
  }) as PaymentFormApiType;

  const paymentValues = useFormStore(paymentForm.store, (state) => state.values);

  const selectedReseller = React.useMemo(() => {
    if (!selectedResellerId) return null;
    return resellers.find((reseller) => reseller.id === selectedResellerId) ?? null;
  }, [resellers, selectedResellerId]);

  React.useEffect(() => {
    if (!hasHydrated) return;
    paymentForm.reset(mapCartToPaymentValues(cartStore.state));
  }, [hasHydrated, paymentForm]);

  React.useEffect(() => {
    patchCart({
      customerName: paymentValues.customerName,
      note: paymentValues.note,
      payment: {
        method: paymentValues.paymentMethod,
        status: paymentValues.paymentStatus,
        dueDate: paymentValues.dueDate ? paymentValues.dueDate : null,
        amountReceived: paymentValues.amountReceived,
      },
    });
  }, [
    paymentValues.amountReceived,
    paymentValues.customerName,
    paymentValues.dueDate,
    paymentValues.note,
    paymentValues.paymentMethod,
    paymentValues.paymentStatus,
  ]);

  React.useEffect(() => {
    if (mode === "customer") {
      paymentForm.setFieldValue("paymentStatus", "paid");
    }
  }, [mode, paymentForm]);

  const handlePaymentMethodChange = React.useCallback(
    (method: PaymentFormValues["paymentMethod"]) => {
      paymentForm.setFieldValue("paymentMethod", method);
      if (method !== "cash") {
        paymentForm.setFieldValue("amountReceived", 0);
      }
    },
    [paymentForm],
  );

  const handlePaymentStatusChange = React.useCallback(
    (status: PaymentFormValues["paymentStatus"]) => {
      paymentForm.setFieldValue("paymentStatus", status);
      if (status !== "unpaid") {
        paymentForm.setFieldValue("dueDate", "");
      }
    },
    [paymentForm],
  );

  const handleDueDateChange = React.useCallback(
    (value: string) => {
      paymentForm.setFieldValue("dueDate", value);
    },
    [paymentForm],
  );

  const handleAmountReceivedChange = React.useCallback(
    (value: number) => {
      paymentForm.setFieldValue("amountReceived", Math.max(0, value));
    },
    [paymentForm],
  );

  const handleNoteChange = React.useCallback(
    (value: string) => {
      paymentForm.setFieldValue("note", value);
    },
    [paymentForm],
  );

  const subtotal = React.useMemo(
    () => cartState.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
    [cartState.lines],
  );

  const discountAmount = React.useMemo(() => {
    if (cartState.discount.type === "amount") {
      return Math.min(cartState.discount.value, subtotal);
    }
    return Math.round((cartState.discount.value / 100) * subtotal);
  }, [cartState.discount, subtotal]);

  const netTotal = Math.max(subtotal - discountAmount, 0);
  const tax = Math.round(netTotal * defaultTaxRate);
  const grandTotal = netTotal + tax;

  const categoryOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    menus.forEach((menu) => {
      if (menu.category_id && menu.category_name) {
        const existing = map.get(menu.category_id);
        if (existing) {
          existing.count += 1;
          return;
        }
        map.set(menu.category_id, {
          id: menu.category_id,
          name: menu.category_name,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [menus]);

  const totalMenuCount = menus.length;

  const filteredMenus = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return menus.filter((menu) => {
      if (categoryFilter !== "all" && menu.category_id !== categoryFilter) {
        return false;
      }
      if (!term) return true;
      return (
        menu.name.toLowerCase().includes(term) ||
        (menu.sku?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [
    menus,
    searchTerm,
    categoryFilter,
  ]);

  const modeChannel = mode === "reseller" ? "reseller" : "pos";

  const canSubmit =
    cartState.lines.length > 0 &&
    (mode === "customer" || (mode === "reseller" && selectedResellerId));

  const handleMenuSelected = React.useCallback(
    (menu: MenuListItem) => {
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
        addCartLine({
          menuId: menu.id,
          menuName: menu.name,
          thumbnailUrl: menu.thumbnail_url ?? menu.category_icon_url ?? null,
          variantKey: null,
          variantLabel: null,
          size: null,
          temperature: null,
          unitPrice: price,
          channel: modeChannel === "reseller" ? "reseller" : "retail",
        });
        return;
      }

      const options = listVariantOptions(menu.variants, menu, modeChannel);
      if (options.length === 0) {
        toast.error("Semua varian belum memiliki harga untuk channel ini");
        return;
      }
      setVariantDialog({ menu, options });
    },
    [mode, modeChannel],
  );

  const handleToggleFavorite = React.useCallback((menuId: string) => {
    toggleFavoriteMenu(menuId);
  }, []);

  const handleModeChange = React.useCallback(
    (nextMode: "customer" | "reseller") => {
      setMode(nextMode);
      if (nextMode === "customer") {
        setSelectedResellerId(null);
        setResellerQuery("");
      } else if (!selectedResellerId) {
        const fallback = resellers[0];
        if (fallback) {
          setSelectedResellerId(fallback.id);
          setResellerQuery(fallback.name);
        }
      }
    },
    [resellers, selectedResellerId],
  );

  const handleSelectReseller = React.useCallback(
    (resellerId: string) => {
      setSelectedResellerId(resellerId);
      const match = resellers.find((reseller) => reseller.id === resellerId);
      if (match) {
        setResellerQuery(match.name);
      }
    },
    [resellers],
  );

  const handleResellerQueryChange = React.useCallback(
    (value: string) => {
      setResellerQuery(value);
      const match = resellers.find(
        (reseller) => reseller.name.toLowerCase() === value.trim().toLowerCase(),
      );
      if (match) {
        setSelectedResellerId(match.id);
      }
    },
    [resellers],
  );

  const handleCustomerNameChange = React.useCallback(
    (value: string) => {
      paymentForm.setFieldValue("customerName", value);
    },
    [paymentForm],
  );

  const handleConfirmVariant = React.useCallback(
    (option: VariantOption, menu: MenuListItem) => {
      addCartLine({
        menuId: menu.id,
        menuName: menu.name,
        thumbnailUrl: menu.thumbnail_url ?? menu.category_icon_url ?? null,
        variantKey: option.key,
        variantLabel: option.label,
        size: option.size,
        temperature: option.temperature,
        unitPrice: option.price,
        channel: modeChannel === "reseller" ? "reseller" : "retail",
      });
      setVariantDialog(null);
    },
    [modeChannel],
  );

  const handleDiscountChange = React.useCallback(
    (discount: CartState["discount"]) => {
      patchCart({ discount });
    },
    [],
  );


  const handleClearCart = React.useCallback(() => {
    clearCart();
    paymentForm.reset(mapCartToPaymentValues(getDefaultCartState()));
  }, [paymentForm]);

  React.useEffect(() => {
    if (mode === "reseller" && selectedResellerId) {
      recordRecentReseller(selectedResellerId);
    }
  }, [mode, selectedResellerId]);


  const submitOrder = React.useCallback(
    async (values: PaymentFormValues) => {
      if (!canSubmit) {
        toast.error("Keranjang belum siap diproses");
        return;
      }

      const clientId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const payload: CreateOrderInput = {
        channel: modeChannel,
        resellerId: mode === "reseller" ? selectedResellerId : null,
        paymentMethod: values.paymentMethod,
        paymentStatus: values.paymentStatus,
        dueDate:
          mode === "reseller" && values.paymentStatus === "unpaid"
            ? values.dueDate || null
            : null,
        note: values.note,
        customerName: values.customerName,
        items: createOrderItems(cartState.lines),
        discount: cartState.discount,
        taxRate: defaultTaxRate,
        bypassServed: cartState.bypassServed,
        amountReceived:
          values.paymentMethod === "cash" ? values.amountReceived : null,
        clientId,
      };

      try {
        await createOrderMutation.mutateAsync(payload);
        toast.success("Transaksi berhasil");
        handleClearCart();
        setPaymentDrawerOpen(false);
      } catch (error) {
        throw error;
      }
    },
    [
      canSubmit,
      cartState.bypassServed,
      cartState.discount,
      cartState.lines,
      createOrderMutation,
      defaultTaxRate,
      handleClearCart,
      mode,
      modeChannel,
      selectedResellerId,
    ],
  );

  const submitPaymentForm = React.useCallback(() => {
    void paymentForm.handleSubmit();
  }, [paymentForm]);

  const submitPaymentWithBypass = React.useCallback(() => {
    patchCart({ bypassServed: true });
    void paymentForm.handleSubmit();
  }, [paymentForm]);

  return {
    mode,
    handleModeChange,
    selectedResellerId,
    handleSelectReseller,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    resellerQuery,
    handleResellerQueryChange,
    categoryOptions,
    totalMenuCount,
    selectedReseller,
    variantDialog,
    setVariantDialog,
    paymentDrawerOpen,
    setPaymentDrawerOpen,
    cartState,
    subtotal,
    discountAmount,
    tax,
    grandTotal,
    filteredMenus,
    favoriteMenuIds: preferences.favoriteMenuIds,
    canSubmit,
    ordersQuery,
    paymentForm,
    paymentValues,
    handleCustomerNameChange,
    handlePaymentMethodChange,
    handlePaymentStatusChange,
    handleDueDateChange,
    handleAmountReceivedChange,
    handleNoteChange,
    handleMenuSelected,
    handleConfirmVariant,
    handleToggleFavorite,
    handleDiscountChange,
    updateCartQuantity,
    removeCartLine,
    handleClearCart,
    submitOrder,
    isSubmittingOrder: createOrderMutation.isPending,
    isHydrating: !hasHydrated,
    submitPaymentForm,
    submitPaymentWithBypass,
  };
}

function mapCartToPaymentValues(state: CartState): PaymentFormValues {
  return {
    paymentMethod: state.payment.method,
    paymentStatus: state.payment.status,
    dueDate: state.payment.dueDate ?? "",
    amountReceived: state.payment.amountReceived,
    note: state.note,
    customerName: state.customerName,
  };
}

