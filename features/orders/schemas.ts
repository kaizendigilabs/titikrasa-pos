import { z } from "zod";

export const CHANNEL_VALUES = ["pos", "reseller"] as const;
export const PAYMENT_METHOD_VALUES = ["cash", "transfer"] as const;
export const PAYMENT_STATUS_VALUES = ["paid", "unpaid", "void"] as const;
export const ORDER_STATUS_VALUES = ["open", "paid", "void", "refunded"] as const;

export const orderItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  menuId: z.string().uuid(),
  menuName: z.string(),
  menuSku: z.string().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  variant: z.string().min(1).nullable(),
  size: z.string().min(1).nullable(),
  temperature: z.string().min(1).nullable(),
  qty: z.number().int().min(1),
  unitPrice: z.number().int().min(0),
  discount: z.number().int().min(0).default(0),
  tax: z.number().int().min(0).default(0),
});

export const discountInputSchema = z.object({
  type: z.enum(["amount", "percent"] as const).default("amount"),
  value: z.number().min(0).default(0),
});

const clientRefSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, {
    message: "clientId hanya boleh mengandung huruf, angka, underscore, atau dash",
  });

export const createOrderSchema = z
  .object({
    channel: z.enum(CHANNEL_VALUES).default("pos"),
    resellerId: z.string().uuid().nullable(),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES).default("cash"),
    paymentStatus: z.enum(PAYMENT_STATUS_VALUES).default("paid"),
    dueDate: z.string().transform((value) => (value ? value : null)).nullable().optional(),
    note: z.string().max(500).optional().default(""),
    customerName: z.string().max(140).optional().default(""),
    clientId: clientRefSchema.optional(),
    items: z.array(orderItemInputSchema).min(1),
    discount: discountInputSchema.default({ type: "amount", value: 0 }),
    taxRate: z.number().min(0).max(1).default(0.11),
    bypassServed: z.boolean().default(false),
    amountReceived: z.number().int().min(0).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.channel === "reseller" && !value.resellerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reseller harus dipilih untuk channel reseller",
        path: ["resellerId"],
      });
    }

    if (value.paymentStatus === "unpaid" && value.channel === "reseller") {
      return;
    }

    if (value.paymentStatus === "unpaid" && value.channel === "pos") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Transaksi POS tidak dapat dibiarkan unpaid",
        path: ["paymentStatus"],
      });
    }

    if (value.paymentStatus === "void") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gunakan endpoint void untuk mengosongkan transaksi",
        path: ["paymentStatus"],
      });
    }
  });

export const updateOrderPaymentSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUS_VALUES),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES).optional(),
  dueDate: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
});

export const voidOrderSchema = z.object({
  reason: z.string().min(3).max(300),
});

export const updateTicketItemSchema = z.object({
  status: z.enum(["queue", "making", "ready", "served"] as const),
  orderItemId: z.string().uuid(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type UpdateOrderPaymentInput = z.infer<typeof updateOrderPaymentSchema>;
export type VoidOrderInput = z.infer<typeof voidOrderSchema>;
export type UpdateTicketItemInput = z.infer<typeof updateTicketItemSchema>;
