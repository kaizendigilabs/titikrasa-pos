import {
  createPurchaseOrderSchema,
  type CreatePurchaseOrderInput,
  type PurchaseOrderFilters,
  type PurchaseOrderStatus,
} from "./schema";

export type PurchaseOrderFormItemState = {
  catalogItemId: string;
  qty: string;
};

export type PurchaseOrderFormState = {
  supplierId: string;
  status: PurchaseOrderStatus;
  issuedAt: string;
  items: PurchaseOrderFormItemState[];
};

export type PurchaseOrderLineErrors = Partial<Record<keyof PurchaseOrderFormItemState, string>>;

export type PurchaseOrderFormErrors = Partial<
  Record<"supplierId" | "status" | "issuedAt", string>
> & {
  items?: PurchaseOrderLineErrors[];
  global?: string;
};

export function createDefaultPurchaseOrderFormState(): PurchaseOrderFormState {
  return {
    supplierId: "",
    status: "draft",
    issuedAt: "",
    items: [{ catalogItemId: "", qty: "1" }],
  };
}

export function normalizeFilters(filters: PurchaseOrderFilters): PurchaseOrderFilters {
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    search: filters.search?.trim() ? filters.search.trim() : undefined,
  };
}

type ResolveCatalog = (
  catalogItemId: string,
) => { id: string; purchase_price: number } | null;

type BuildCreateInputOptions = {
  resolveCatalog: ResolveCatalog;
};

export function buildCreatePurchaseOrderInput(
  state: PurchaseOrderFormState,
  options: BuildCreateInputOptions,
): { result: CreatePurchaseOrderInput | null; errors: PurchaseOrderFormErrors } {
  const lineErrors: PurchaseOrderLineErrors[] = state.items.map(() => ({}));
  let hasLineError = false;

  const mappedItems = state.items.map((item, index) => {
    const catalog = options.resolveCatalog(item.catalogItemId);
    if (!catalog) {
      lineErrors[index].catalogItemId = "Item katalog tidak valid";
      hasLineError = true;
      return null;
    }
    return {
      catalogItemId: catalog.id,
      qty: item.qty,
      price: catalog.purchase_price ?? 0,
    };
  });

  if (hasLineError) {
    return { result: null, errors: { items: lineErrors } };
  }

  const parsed = createPurchaseOrderSchema.safeParse({
    supplierId: state.supplierId,
    status: state.status,
    issuedAt: state.issuedAt?.trim() ? state.issuedAt.trim() : undefined,
    items: mappedItems,
    totals: undefined,
  });

  if (!parsed.success) {
    const errors: PurchaseOrderFormErrors = {};
    for (const issue of parsed.error.issues) {
      const [path, index] = issue.path;
      if (path === "items" && typeof index === "number") {
        const line = lineErrors[index] ?? {};
        if (issue.path[2] === "qty") {
          line.qty = issue.message;
        } else if (issue.path[2] === "catalogItemId") {
          line.catalogItemId = issue.message;
        }
        lineErrors[index] = line;
        errors.items = lineErrors;
        continue;
      }
      if (path === "supplierId" || path === "status" || path === "issuedAt") {
        errors[path] = issue.message;
        continue;
      }
    }
    if (!Object.keys(errors).length) {
      errors.global = parsed.error.issues[0]?.message ?? "Input tidak valid";
    }
    return { result: null, errors };
  }

  const totals = parsed.data.items.reduce((sum, item) => {
    const price = item.price ?? 0;
    return sum + price * item.qty;
  }, 0);

  return {
    result: {
      ...parsed.data,
      totals: {
        ...(parsed.data.totals ?? {}),
        grand_total: totals,
      },
    },
    errors: {},
  };
}

export function clearPurchaseOrderFormError(
  errors: PurchaseOrderFormErrors,
  key: keyof PurchaseOrderFormErrors,
): PurchaseOrderFormErrors {
  if (!(key in errors)) {
    return errors;
  }
  const next = { ...errors };
  if (key === "items") {
    next.items = next.items?.map(() => ({}));
  } else {
    delete next[key];
  }
  if (Object.keys(next).length === 0) {
    return {};
  }
  return next;
}
