import { SimpleStore } from "@/lib/store/simple-store";

import type {
  MenuSize,
  MenuTemperature,
} from "@/features/menus/types";
import type {
  CreateOrderInput,
  OrderItemInput,
} from "@/features/orders/schemas";

type Channel = "retail" | "reseller";

export type CartLine = {
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
  channel: Channel;
};

export type CartDiscount = {
  type: CreateOrderInput["discount"]["type"];
  value: number;
};

export type CartState = {
  lines: CartLine[];
  discount: CartDiscount;
  customerName: string;
  note: string;
  bypassServed: boolean;
  payment: {
    method: CreateOrderInput["paymentMethod"];
    status: CreateOrderInput["paymentStatus"];
    dueDate: string | null;
    amountReceived: number;
  };
};

function buildDefaultState(): CartState {
  return {
    lines: [],
    discount: { type: "amount", value: 0 },
    customerName: "",
    note: "",
    bypassServed: false,
    payment: {
      method: "cash",
      status: "paid",
      dueDate: null,
      amountReceived: 0,
    },
  };
}

export function getDefaultCartState(): CartState {
  return buildDefaultState();
}

export const CART_STORAGE_KEY = "pos.cart.v1";

export const cartStore = new SimpleStore<CartState>(buildDefaultState());

function persistState(state: CartState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("[POS_CART_PERSIST_ERROR]", error);
  }
}

export function hydrateCartStore() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as Partial<CartState>;
    cartStore.setState((prev) => ({
      ...prev,
      ...parsed,
      lines: parsed.lines ?? [],
      discount: parsed.discount ?? prev.discount,
      payment: parsed.payment ?? prev.payment,
    }));
  } catch (error) {
    console.warn("[POS_CART_HYDRATE_FAILED]", error);
  }
}

cartStore.subscribe(() => {
  persistState(cartStore.state);
});

type CartLinePayload = Omit<CartLine, "lineId" | "qty"> & {
  qty?: number;
};

function isSameLine(target: CartLine, payload: CartLinePayload) {
  return (
    target.menuId === payload.menuId &&
    target.variantKey === (payload.variantKey ?? null) &&
    target.channel === payload.channel
  );
}

export function addCartLine(payload: CartLinePayload) {
  cartStore.setState((prev) => {
    const qty = payload.qty ?? 1;
    const existingIndex = prev.lines.findIndex((line) =>
      isSameLine(line, payload),
    );

    if (existingIndex >= 0) {
      const nextLines = [...prev.lines];
      nextLines[existingIndex] = {
        ...nextLines[existingIndex],
        qty: nextLines[existingIndex].qty + qty,
      };
      return { ...prev, lines: nextLines };
    }

    const { variantKey, variantLabel, size, temperature, ...rest } = payload;
    const nextLine: CartLine = {
      lineId: crypto.randomUUID(),
      qty,
      variantKey: variantKey ?? null,
      variantLabel: variantLabel ?? null,
      size: size ?? null,
      temperature: temperature ?? null,
      ...rest,
    };

    return { ...prev, lines: [...prev.lines, nextLine] };
  });
}

export function updateCartQuantity(lineId: string, qty: number) {
  cartStore.setState((prev) => {
    const nextLines = prev.lines
      .map((line) =>
        line.lineId === lineId ? { ...line, qty: Math.max(1, qty) } : line,
      )
      .filter((line) => line.qty > 0);
    return { ...prev, lines: nextLines };
  });
}

export function removeCartLine(lineId: string) {
  cartStore.setState((prev) => ({
    ...prev,
    lines: prev.lines.filter((line) => line.lineId !== lineId),
  }));
}

export function clearCart() {
  cartStore.setState(() => buildDefaultState());
}

export function patchCart(partial: Partial<CartState>) {
  cartStore.setState((prev) => ({
    ...prev,
    ...partial,
    discount: partial.discount ?? prev.discount,
    payment: partial.payment ? { ...prev.payment, ...partial.payment } : prev.payment,
  }));
}

export function createOrderItems(lines: CartLine[]): OrderItemInput[] {
  return lines.map((line) => ({
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
}
