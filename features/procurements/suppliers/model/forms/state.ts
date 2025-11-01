import { z } from "zod";

import type { SupplierCatalogItem, SupplierListItem } from "../../types";
import {
  baseUomEnum,
  createCatalogItemSchema,
  createSupplierSchema,
  supplierContactSchema,
  updateCatalogItemSchema,
  updateSupplierSchema,
  type CreateCatalogItemPayload,
  type CreateSupplierPayload,
  type SupplierFilters,
  type UpdateCatalogItemPayload,
  type UpdateSupplierPayload,
} from "./schema";

export type SupplierFormState = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  note: string;
  isActive: boolean;
};

export type SupplierFormErrors = Partial<Record<keyof SupplierFormState | "form", string>>;

export function createDefaultSupplierFormState(): SupplierFormState {
  return {
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    note: "",
    isActive: true,
  };
}

export function mapSupplierToFormState(supplier: SupplierListItem): SupplierFormState {
  return {
    name: supplier.name,
    contactName: supplier.contact.name ?? "",
    email: supplier.contact.email ?? "",
    phone: supplier.contact.phone ?? "",
    address: supplier.contact.address ?? "",
    note: supplier.contact.note ?? "",
    isActive: supplier.is_active,
  };
}

function buildContactPayload(state: SupplierFormState) {
  const contactInput = supplierContactSchema.safeParse({
    name: state.contactName,
    email: state.email,
    phone: state.phone,
    address: state.address,
    note: state.note,
  });

  if (!contactInput.success) {
    const errors: SupplierFormErrors = {};
    for (const issue of contactInput.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") {
        const mapKey =
          key === "name"
            ? "contactName"
            : key === "email"
            ? "email"
            : key === "phone"
            ? "phone"
            : key === "address"
            ? "address"
            : key === "note"
            ? "note"
            : null;
        if (mapKey) {
          errors[mapKey as keyof SupplierFormState] = issue.message;
        }
      }
    }
    return { success: false, errors } as const;
  }

  return {
    success: true,
    contact: Object.keys(contactInput.data).length ? contactInput.data : undefined,
  } as const;
}

export function buildCreateSupplierInput(
  state: SupplierFormState,
): { success: true; payload: CreateSupplierPayload } | { success: false; errors: SupplierFormErrors } {
  const contactResult = buildContactPayload(state);
  if (!contactResult.success) {
    return contactResult;
  }

  const parsed = createSupplierSchema.safeParse({
    name: state.name,
    contact: contactResult.contact,
    isActive: state.isActive,
  });

  if (!parsed.success) {
    const errors: SupplierFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name") {
        errors.name = issue.message;
      } else if (key === "contact") {
        errors.form = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, payload: parsed.data };
}

export function buildUpdateSupplierInput(
  state: SupplierFormState,
  supplier: SupplierListItem,
): { success: true; payload: UpdateSupplierPayload } | { success: false; errors: SupplierFormErrors } {
  const contactResult = buildContactPayload(state);
  if (!contactResult.success) {
    return contactResult;
  }

  const parsed = updateSupplierSchema.safeParse({
    name: state.name !== supplier.name ? state.name : undefined,
    contact: contactResult.contact,
    isActive: state.isActive !== supplier.is_active ? state.isActive : undefined,
  });

  if (!parsed.success) {
    const errors: SupplierFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name") {
        errors.name = issue.message;
      } else if (key === "contact") {
        errors.form = issue.message;
      } else if (!key) {
        errors.form = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, payload: parsed.data };
}

export type CatalogFormState = {
  name: string;
  baseUom: z.infer<typeof baseUomEnum>;
  purchasePrice: string;
  isActive: boolean;
};

export type CatalogFormErrors = Partial<Record<keyof CatalogFormState | "form", string>>;

export function createDefaultCatalogFormState(): CatalogFormState {
  return {
    name: "",
    baseUom: "pcs",
    purchasePrice: "0",
    isActive: true,
  };
}

export function mapCatalogItemToFormState(item: SupplierCatalogItem): CatalogFormState {
  return {
    name: item.name,
    baseUom: (item.base_uom as CatalogFormState["baseUom"]) ?? "pcs",
    purchasePrice: String(item.purchase_price ?? 0),
    isActive: item.is_active,
  };
}

export function buildCreateCatalogItemInput(
  supplierId: string,
  state: CatalogFormState,
):
  | { success: true; payload: CreateCatalogItemPayload }
  | { success: false; errors: CatalogFormErrors } {
  const parsed = createCatalogItemSchema.safeParse({
    supplierId,
    name: state.name,
    baseUom: state.baseUom,
    purchasePrice: state.purchasePrice,
    isActive: state.isActive,
  });

  if (!parsed.success) {
    const errors: CatalogFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name") {
        errors.name = issue.message;
      } else if (key === "baseUom") {
        errors.baseUom = issue.message;
      } else if (key === "purchasePrice") {
        errors.purchasePrice = issue.message;
      } else {
        errors.form = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, payload: parsed.data };
}

export function buildUpdateCatalogItemInput(
  supplierId: string,
  state: CatalogFormState,
  current: SupplierCatalogItem,
):
  | { success: true; payload: UpdateCatalogItemPayload }
  | { success: false; errors: CatalogFormErrors } {
  const parsed = updateCatalogItemSchema.safeParse({
    supplierId,
    name: state.name !== current.name ? state.name : undefined,
    baseUom: state.baseUom !== (current.base_uom as CatalogFormState["baseUom"])
      ? state.baseUom
      : undefined,
    purchasePrice:
      Number(state.purchasePrice) !== current.purchase_price
        ? state.purchasePrice
        : undefined,
    isActive: state.isActive !== current.is_active ? state.isActive : undefined,
  });

  if (!parsed.success) {
    const errors: CatalogFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name") {
        errors.name = issue.message;
      } else if (key === "baseUom") {
        errors.baseUom = issue.message;
      } else if (key === "purchasePrice") {
        errors.purchasePrice = issue.message;
      } else {
        errors.form = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, payload: parsed.data };
}

export function normalizeSupplierFilters(filters: SupplierFilters): SupplierFilters {
  return {
    page: Math.max(1, filters.page),
    pageSize: Math.min(200, Math.max(1, filters.pageSize)),
    search: filters.search?.trim() ? filters.search.trim() : undefined,
    status: filters.status,
  };
}
