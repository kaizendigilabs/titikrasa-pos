import { randomBytes } from "crypto";

import type { CreateOrderInput, OrderItemInput } from "./schemas";
import type { OrderTotals } from "./types";

const ORDER_NUMBER_PREFIX = "TR";

export function computeOrderTotals(
  items: OrderItemInput[],
  discount: CreateOrderInput["discount"],
  taxRate: number,
): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  let discountValue = 0;
  if (discount.type === "amount") {
    discountValue = Math.min(discount.value, subtotal);
  } else {
    discountValue = Math.round((discount.value / 100) * subtotal);
  }
  const net = Math.max(subtotal - discountValue, 0);
  const tax = Math.round(net * taxRate);
  const grand = net + tax;
  return {
    subtotal,
    discount: discountValue,
    tax,
    grand,
  };
}

export function buildOrderNumber(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `${ORDER_NUMBER_PREFIX}-${yyyy}${mm}${dd}-${random}`;
}

