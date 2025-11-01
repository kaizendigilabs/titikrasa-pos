import { createMenuCategorySchema, updateMenuCategorySchema } from "./schema";
import type {
  CreateMenuCategoryPayload,
  UpdateMenuCategoryPayload,
} from "./schema";
import type { MenuCategory } from "../../types";

export type MenuCategoryFormState = {
  name: string;
  slug: string;
  iconUrl: string;
  sortOrder: string;
  isActive: boolean;
};

export type MenuCategoryFormErrors = Partial<
  Record<keyof MenuCategoryFormState, string>
> & { global?: string };

export function createDefaultMenuCategoryFormState(): MenuCategoryFormState {
  return {
    name: "",
    slug: "",
    iconUrl: "",
    sortOrder: "",
    isActive: true,
  };
}

export function mapCategoryToFormState(
  category: MenuCategory,
): MenuCategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    iconUrl: category.icon_url ?? "",
    sortOrder: String(category.sort_order ?? ""),
    isActive: category.is_active,
  };
}

export function buildCreateMenuCategoryInput(
  state: MenuCategoryFormState,
): { result: CreateMenuCategoryPayload | null; errors: MenuCategoryFormErrors } {
  const parsed = createMenuCategorySchema.safeParse({
    name: state.name,
    slug: state.slug,
    iconUrl: state.iconUrl,
    sortOrder: state.sortOrder.length ? Number(state.sortOrder) : undefined,
    isActive: state.isActive,
  });

  if (!parsed.success) {
    const fieldErrors: MenuCategoryFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && key in createDefaultMenuCategoryFormState()) {
        fieldErrors[key as keyof MenuCategoryFormState] = issue.message;
      }
    }
    if (!Object.keys(fieldErrors).length) {
      fieldErrors.global = parsed.error.issues[0]?.message ?? "Input tidak valid";
    }
    return { result: null, errors: fieldErrors };
  }

  return { result: parsed.data, errors: {} };
}

export function buildUpdateMenuCategoryInput(
  state: MenuCategoryFormState,
  original: MenuCategory,
): { result: UpdateMenuCategoryPayload | null; errors: MenuCategoryFormErrors } {
  const payload: UpdateMenuCategoryPayload = {
    name: state.name,
    slug: state.slug,
    iconUrl: state.iconUrl,
    sortOrder: state.sortOrder.length ? Number(state.sortOrder) : null,
    isActive: state.isActive,
  };

  const parsed = updateMenuCategorySchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: MenuCategoryFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && key in createDefaultMenuCategoryFormState()) {
        fieldErrors[key as keyof MenuCategoryFormState] = issue.message;
      }
    }
    if (!Object.keys(fieldErrors).length) {
      fieldErrors.global = parsed.error.issues[0]?.message ?? "Input tidak valid";
    }
    return { result: null, errors: fieldErrors };
  }

  const normalized: UpdateMenuCategoryPayload = {};
  if (parsed.data.name && parsed.data.name !== original.name) {
    normalized.name = parsed.data.name;
  }
  if (parsed.data.slug && parsed.data.slug !== original.slug) {
    normalized.slug = parsed.data.slug;
  }
  if (parsed.data.iconUrl !== undefined && parsed.data.iconUrl !== original.icon_url) {
    normalized.iconUrl = parsed.data.iconUrl;
  }
  if (
    parsed.data.sortOrder !== undefined &&
    parsed.data.sortOrder !== original.sort_order
  ) {
    normalized.sortOrder = parsed.data.sortOrder;
  }
  if (parsed.data.isActive !== undefined && parsed.data.isActive !== original.is_active) {
    normalized.isActive = parsed.data.isActive;
  }

  return { result: normalized, errors: {} };
}

export function clearMenuCategoryFormErrors(
  errors: MenuCategoryFormErrors,
  key: keyof MenuCategoryFormState,
): MenuCategoryFormErrors {
  if (!errors[key] && !errors.global) return errors;
  const next = { ...errors };
  delete next[key];
  if (Object.keys(next).length === 1 && "global" in next) {
    delete next.global;
  }
  return next;
}
