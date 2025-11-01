import { type ZodError } from "zod";

import type { ResellerListItem } from "../../types";
import {
  createResellerSchema,
  updateResellerSchema,
  type CreateResellerPayload,
  type UpdateResellerPayload,
} from "./schema";

export type ResellerFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  note: string;
  paymentTermDays: string;
  discountPercent: string;
  isActive: boolean;
};

export type ResellerFormErrors = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  note?: string;
  paymentTermDays?: string;
  discountPercent?: string;
  form?: string;
};

type FormResult<TPayload> =
  | { success: true; payload: TPayload }
  | { success: false; errors: ResellerFormErrors };

export function createDefaultResellerFormState(): ResellerFormState {
  return {
    name: "",
    email: "",
    phone: "",
    address: "",
    note: "",
    paymentTermDays: "",
    discountPercent: "",
    isActive: true,
  };
}

export function mapResellerToFormState(
  reseller: ResellerListItem,
): ResellerFormState {
  return {
    name: reseller.name ?? "",
    email: reseller.contact.email ?? "",
    phone: reseller.contact.phone ?? "",
    address: reseller.contact.address ?? "",
    note: reseller.contact.note ?? "",
    paymentTermDays:
      reseller.terms.paymentTermDays !== null &&
      reseller.terms.paymentTermDays !== undefined
        ? String(reseller.terms.paymentTermDays)
        : "",
    discountPercent:
      reseller.terms.discountPercent !== null &&
      reseller.terms.discountPercent !== undefined
        ? String(reseller.terms.discountPercent)
        : "",
    isActive: reseller.is_active,
  };
}

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

function mapZodErrors(error: ZodError): ResellerFormErrors {
  const errors: ResellerFormErrors = {};
  for (const issue of error.errors) {
    const path = issue.path.join(".");
    const message = issue.message;
    switch (path) {
      case "name":
        errors.name = message;
        break;
      case "contact.email":
        errors.email = message;
        break;
      case "contact.phone":
        errors.phone = message;
        break;
      case "contact.address":
        errors.address = message;
        break;
      case "contact.note":
        errors.note = message;
        break;
      case "terms.paymentTermDays":
        errors.paymentTermDays = message;
        break;
      case "terms.discountPercent":
        errors.discountPercent = message;
        break;
      default:
        errors.form = message;
        break;
    }
  }
  return errors;
}

function buildBasePayload(state: ResellerFormState) {
  const contact: Record<string, string> = {};
  if (state.email.trim()) contact.email = state.email.trim();
  if (state.phone.trim()) contact.phone = state.phone.trim();
  if (state.address.trim()) contact.address = state.address.trim();
  if (state.note.trim()) contact.note = state.note.trim();

  const terms: Record<string, number> = {};
  const paymentTermDays = toNumber(state.paymentTermDays);
  if (paymentTermDays !== undefined) {
    terms.paymentTermDays = paymentTermDays;
  }
  const discountPercent = toNumber(state.discountPercent);
  if (discountPercent !== undefined) {
    terms.discountPercent = discountPercent;
  }

  const payload = {
    name: state.name.trim(),
    isActive: state.isActive,
    contact: Object.keys(contact).length ? contact : undefined,
    terms: Object.keys(terms).length ? terms : undefined,
  } satisfies CreateResellerPayload;

  return payload;
}

export function buildCreateResellerInput(
  state: ResellerFormState,
): FormResult<CreateResellerPayload> {
  const payload = buildBasePayload(state);
  const result = createResellerSchema.safeParse(payload);
  if (!result.success) {
    return { success: false, errors: mapZodErrors(result.error) };
  }
  return { success: true, payload: result.data };
}

export function buildUpdateResellerInput(
  state: ResellerFormState,
  original: ResellerListItem,
): FormResult<UpdateResellerPayload> {
  const base = buildBasePayload(state);

  const contactChanges: Record<string, string> = {};
  if (base.contact) {
    for (const [key, value] of Object.entries(base.contact)) {
      const originalValue = (original.contact as Record<string, unknown>)[
        key
      ];
      if (value !== (originalValue ?? "")) {
        contactChanges[key] = value;
      }
    }
  }

  const termsChanges: Record<string, number> = {};
  if (base.terms) {
    for (const [key, value] of Object.entries(base.terms)) {
      const originalValue = (original.terms as Record<string, unknown>)[key];
      if (value !== originalValue) {
        termsChanges[key] = value;
      }
    }
  }

  const payload: UpdateResellerPayload = {};
  if (base.name && base.name !== original.name) {
    payload.name = base.name;
  }
  if (Object.keys(contactChanges).length > 0) {
    payload.contact = contactChanges;
  }
  if (Object.keys(termsChanges).length > 0) {
    payload.terms = termsChanges;
  }
  if (base.isActive !== original.is_active) {
    payload.isActive = base.isActive;
  }

  const result = updateResellerSchema.safeParse(payload);
  if (!result.success) {
    return { success: false, errors: mapZodErrors(result.error) };
  }

  return { success: true, payload: result.data };
}
