import { SimpleStore } from "@/lib/store/simple-store";

export type PosPreferencesState = {
  favoriteMenuIds: string[];
  recentResellerIds: string[];
};

const DEFAULT_STATE: PosPreferencesState = {
  favoriteMenuIds: [],
  recentResellerIds: [],
};

export const PREFERENCES_STORAGE_KEY = "pos.preferences.v1";

export const preferencesStore = new SimpleStore<PosPreferencesState>(DEFAULT_STATE);

function persistPreferences(state: PosPreferencesState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("[POS_PREFERENCES_PERSIST_ERROR]", error);
  }
}

export function hydratePreferencesStore() {
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as Partial<PosPreferencesState>;
    preferencesStore.setState((prev) => ({
      favoriteMenuIds: parsed.favoriteMenuIds ?? prev.favoriteMenuIds,
      recentResellerIds: parsed.recentResellerIds ?? prev.recentResellerIds,
    }));
  } catch (error) {
    console.warn("[POS_PREFERENCES_HYDRATE_FAILED]", error);
  }
}

preferencesStore.subscribe(() => persistPreferences(preferencesStore.state));

export function toggleFavoriteMenu(menuId: string) {
  preferencesStore.setState((prev) => {
    const exists = prev.favoriteMenuIds.includes(menuId);
    return {
      ...prev,
      favoriteMenuIds: exists
        ? prev.favoriteMenuIds.filter((id) => id !== menuId)
        : [...prev.favoriteMenuIds, menuId],
    };
  });
}

export function recordRecentReseller(resellerId: string) {
  preferencesStore.setState((prev) => {
    const next = [resellerId, ...prev.recentResellerIds.filter((id) => id !== resellerId)];
    return {
      ...prev,
      recentResellerIds: next.slice(0, 5),
    };
  });
}
