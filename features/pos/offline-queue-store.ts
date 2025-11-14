import { SimpleStore } from "@/lib/store/simple-store";

import type { CreateOrderInput } from "@/features/orders/schemas";

export type QueuedOrder = {
  id: string;
  payload: CreateOrderInput;
  createdAt: string;
  status: "queued" | "syncing" | "failed";
  error?: string;
};

export type QueueState = {
  orders: QueuedOrder[];
};

const DEFAULT_STATE: QueueState = {
  orders: [],
};

export const QUEUE_STORAGE_KEY = "pos.queue.v1";

export const queueStore = new SimpleStore<QueueState>(DEFAULT_STATE);

function persistQueue(state: QueueState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("[POS_QUEUE_PERSIST_ERROR]", error);
  }
}

export function hydrateQueueStore() {
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as QueueState;
    queueStore.setState(() => ({
      orders: parsed.orders ?? [],
    }));
  } catch (error) {
    console.warn("[POS_QUEUE_HYDRATE_FAILED]", error);
  }
}

queueStore.subscribe(() => {
  persistQueue(queueStore.state);
});

export function enqueueOrder(payload: CreateOrderInput) {
  const entry: QueuedOrder = {
    id: crypto.randomUUID(),
    payload,
    createdAt: new Date().toISOString(),
    status: "queued",
  };

  queueStore.setState((prev) => ({
    orders: [...prev.orders, entry],
  }));

  return entry;
}

export function markOrderSyncing(id: string) {
  queueStore.setState((prev) => ({
    orders: prev.orders.map((order) =>
      order.id === id ? { ...order, status: "syncing", error: undefined } : order,
    ),
  }));
}

export function markOrderSynced(id: string) {
  queueStore.setState((prev) => ({
    orders: prev.orders.filter((order) => order.id !== id),
  }));
}

export function markOrderFailed(id: string, error: string) {
  queueStore.setState((prev) => ({
    orders: prev.orders.map((order) =>
      order.id === id ? { ...order, status: "failed", error } : order,
    ),
  }));
}
