import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import {
  createCashFlow,
  deleteCashFlow,
  listCashFlows,
  listCategories,
  updateCashFlow,
  createCategory,
  deleteCategory,
} from "./client";
import type { CashFlowFilters } from "./types";
import type { CreateCashFlowSchema, UpdateCashFlowSchema, CreateCategorySchema } from "./schemas";
import { toast } from "sonner";

const FINANCE_KEYS = {
  all: ["cash-flows"] as const,
  lists: () => [...FINANCE_KEYS.all, "list"] as const,
  list: (filters: CashFlowFilters) => [...FINANCE_KEYS.lists(), filters] as const,
  categories: ["cash-flow-categories"] as const,
};

export function useCashFlows(filters: CashFlowFilters) {
  return useQuery({
    queryKey: FINANCE_KEYS.list(filters),
    queryFn: () => listCashFlows(filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.FREQUENT,
  });
}

export function useCashFlowCategories() {
  return useQuery({
    queryKey: FINANCE_KEYS.categories,
    queryFn: listCategories,
    ...CACHE_POLICIES.STATIC,
  });
}

export function useCreateCashFlowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCashFlowSchema) => createCashFlow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
      toast.success("Transaksi berhasil dicatat");
    },
    onError: (error) => {
      toast.error("Gagal mencatat transaksi");
      console.error(error);
    },
  });
}

export function useUpdateCashFlowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCashFlowSchema }) =>
      updateCashFlow(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
      toast.success("Transaksi berhasil diperbarui");
    },
    onError: (error) => {
      toast.error("Gagal memperbarui transaksi");
      console.error(error);
    },
  });
}

export function useDeleteCashFlowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCashFlow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
      toast.success("Transaksi berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus transaksi");
      console.error(error);
    },
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCategorySchema) => createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.categories });
      toast.success("Kategori berhasil dibuat");
    },
    onError: (error) => {
      toast.error("Gagal membuat kategori");
      console.error(error);
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.categories });
      toast.success("Kategori berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus kategori");
      console.error(error);
    },
  });
}
