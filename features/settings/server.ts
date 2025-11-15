import type { Json } from "@/lib/types/database";
import { appError, ERR } from "@/lib/utils/errors";
import type { ActorContext } from "@/features/users/server";
import type {
  SettingsPayload,
  SettingsUpdateInput,
  TaxSettings,
  DiscountSettings,
  StoreProfileSettings,
  ReceiptNumberingSettings,
} from "./types";

const SETTINGS_KEYS = {
  tax: "pos.tax_rate",
  discount: "pos.default_discount",
  storeProfile: "store.profile",
  receiptNumbering: "pos.receipt_numbering",
} as const;

const DEFAULT_SETTINGS: SettingsPayload = {
  tax: { rate: 0.11, autoApply: true, label: "Default 11%" },
  discount: { mode: "none", value: 0 },
  storeProfile: {
    name: "Titikrasa Coffee",
    address: "Jl. Contoh No. 123, Bandung",
    phone: "+62-812-0000-0000",
    logoUrl: null,
    footerNote: "Terima kasih telah berbelanja di Titikrasa",
  },
  receiptNumbering: {
    posPrefix: "POS",
    resellerPrefix: "RES",
    padding: 4,
    autoReset: "daily",
  },
};

type RawSettingValue = Record<string, unknown> | null;

function parseTax(value: RawSettingValue): TaxSettings {
  if (!value) return DEFAULT_SETTINGS.tax;
  const rateProp =
    typeof value.rate === "number"
      ? value.rate
      : typeof value.value === "number"
        ? value.value
        : DEFAULT_SETTINGS.tax.rate;
  const rate = Math.min(Math.max(rateProp, 0), 0.3);
  return {
    rate,
    autoApply:
      typeof value.autoApply === "boolean"
        ? value.autoApply
        : DEFAULT_SETTINGS.tax.autoApply,
    label:
      typeof value.label === "string" ? value.label : DEFAULT_SETTINGS.tax.label ?? null,
  };
}

function parseDiscount(value: RawSettingValue): DiscountSettings {
  if (!value) return DEFAULT_SETTINGS.discount;
  const mode =
    value.mode === "percentage" || value.mode === "nominal" || value.mode === "none"
      ? value.mode
      : DEFAULT_SETTINGS.discount.mode;
  const rawValue = typeof value.value === "number" ? value.value : DEFAULT_SETTINGS.discount.value;
  const normalizedValue =
    mode === "percentage" ? Math.min(Math.max(rawValue, 0), 1) : Math.max(Math.round(rawValue), 0);
  return { mode, value: normalizedValue };
}

function parseStoreProfile(value: RawSettingValue): StoreProfileSettings {
  if (!value) return DEFAULT_SETTINGS.storeProfile;
  return {
    name: typeof value.name === "string" && value.name.length > 0 ? value.name : DEFAULT_SETTINGS.storeProfile.name,
    address:
      typeof value.address === "string" && value.address.length > 0
        ? value.address
        : DEFAULT_SETTINGS.storeProfile.address,
    phone:
      typeof value.phone === "string" && value.phone.length > 0
        ? value.phone
        : DEFAULT_SETTINGS.storeProfile.phone,
    logoUrl: typeof value.logoUrl === "string" ? value.logoUrl : null,
    footerNote: typeof value.footerNote === "string" ? value.footerNote : DEFAULT_SETTINGS.storeProfile.footerNote,
  };
}

function parseReceiptNumbering(value: RawSettingValue): ReceiptNumberingSettings {
  if (!value) return DEFAULT_SETTINGS.receiptNumbering;
  const autoReset =
    value.autoReset === "none" || value.autoReset === "daily"
      ? value.autoReset
      : DEFAULT_SETTINGS.receiptNumbering.autoReset;
  const padding =
    typeof value.padding === "number"
      ? Math.min(Math.max(Math.trunc(value.padding), 3), 6)
      : DEFAULT_SETTINGS.receiptNumbering.padding;

  return {
    posPrefix:
      typeof value.posPrefix === "string" && value.posPrefix.length > 0
        ? value.posPrefix
        : DEFAULT_SETTINGS.receiptNumbering.posPrefix,
    resellerPrefix:
      typeof value.resellerPrefix === "string" && value.resellerPrefix.length > 0
        ? value.resellerPrefix
        : DEFAULT_SETTINGS.receiptNumbering.resellerPrefix,
    padding,
    autoReset,
  };
}

function rowsToMap(data: { key: string; value: Json }[] | null) {
  const map = new Map<string, Json>();
  data?.forEach((row) => {
    map.set(row.key, row.value);
  });
  return map;
}

export async function getSettings(actor: ActorContext): Promise<SettingsPayload> {
  const { data, error } = await actor.supabase.from("settings").select("key, value");

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memuat pengaturan",
      details: { hint: error.message },
    });
  }

  const map = rowsToMap(data ?? []);

  return {
    tax: parseTax((map.get(SETTINGS_KEYS.tax) as RawSettingValue) ?? null),
    discount: parseDiscount((map.get(SETTINGS_KEYS.discount) as RawSettingValue) ?? null),
    storeProfile: parseStoreProfile((map.get(SETTINGS_KEYS.storeProfile) as RawSettingValue) ?? null),
    receiptNumbering: parseReceiptNumbering(
      (map.get(SETTINGS_KEYS.receiptNumbering) as RawSettingValue) ?? null,
    ),
  };
}

export async function updateSettings(
  actor: ActorContext,
  payload: SettingsUpdateInput,
): Promise<SettingsPayload> {
  const updates: Array<{ key: string; value: Json }> = [];

  if (payload.tax) {
    updates.push({
      key: SETTINGS_KEYS.tax,
      value: {
        rate: payload.tax.rate,
        autoApply: payload.tax.autoApply,
        label: payload.tax.label ?? null,
      },
    });
  }

  if (payload.discount) {
    updates.push({
      key: SETTINGS_KEYS.discount,
      value: {
        mode: payload.discount.mode,
        value: payload.discount.value,
      },
    });
  }

  if (payload.storeProfile) {
    updates.push({
      key: SETTINGS_KEYS.storeProfile,
      value: {
        name: payload.storeProfile.name,
        address: payload.storeProfile.address,
        phone: payload.storeProfile.phone,
        logoUrl: payload.storeProfile.logoUrl,
        footerNote: payload.storeProfile.footerNote,
      },
    });
  }

  if (payload.receiptNumbering) {
    updates.push({
      key: SETTINGS_KEYS.receiptNumbering,
      value: {
        posPrefix: payload.receiptNumbering.posPrefix,
        resellerPrefix: payload.receiptNumbering.resellerPrefix,
        padding: payload.receiptNumbering.padding,
        autoReset: payload.receiptNumbering.autoReset,
      },
    });
  }

  if (updates.length > 0) {
    const { error } = await actor.supabase
      .from("settings")
      .upsert(
        updates.map((entry) => ({
          key: entry.key,
          value: entry.value,
        })),
        { onConflict: "key" },
      );

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memperbarui pengaturan",
        details: { hint: error.message },
      });
    }
  }

  return getSettings(actor);
}

export function getSettingsDefaults(): SettingsPayload {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as SettingsPayload;
}
