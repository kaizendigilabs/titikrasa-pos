"use client";

import * as React from "react";
import { useForm, useStore } from "@tanstack/react-form";
import type { ReactFormExtendedApi } from "@tanstack/react-form";
import { toast } from "sonner";

import {
  useCreateStockAdjustmentMutation,
} from "@/features/inventory/stock-adjustments/hooks";
import type { CreateStockAdjustmentPayload } from "@/features/inventory/stock-adjustments/types";

export type StockOpnameIngredientRow = {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  baseUom: string;
};

export type StockOpnameFormValues = {
  notes: string;
  items: Array<{
    ingredientId: string;
    name: string;
    baseUom: string;
    currentStock: number;
    minStock: number;
    actual: string;
  }>;
};

export type ParsedRow = {
  ingredientId: string;
  name: string;
  baseUom: string;
  currentStock: number;
  actual: number;
  delta: number;
  minStock: number;
};

export type UseStockOpnameControllerArgs = {
  ingredients: StockOpnameIngredientRow[];
  canApprove: boolean;
};

type StockOpnameFormApi = ReactFormExtendedApi<
  StockOpnameFormValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;

export type UseStockOpnameControllerResult = {
  form: StockOpnameFormApi;
  rows: ParsedRow[];
  outstandingCount: number;
  isSubmitting: boolean;
  error: string | null;
  statusMessage: string | null;
  resetCounts: () => void;
  submit: () => Promise<void>;
};

export function useStockOpnameController({
  ingredients,
}: UseStockOpnameControllerArgs): UseStockOpnameControllerResult {
  const mutation = useCreateStockAdjustmentMutation();
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);


  const buildDefaults = React.useCallback((): StockOpnameFormValues => {
    return {
      notes: "",
      items: ingredients.map((ingredient) => ({
        ingredientId: ingredient.id,
        name: ingredient.name,
        baseUom: ingredient.baseUom,
        currentStock: ingredient.currentStock ?? 0,
        minStock: ingredient.minStock ?? 0,
        actual: String(ingredient.currentStock ?? 0),
      })),
    };
  }, [ingredients]);

  const form = useForm({
    defaultValues: buildDefaults(),
  }) as StockOpnameFormApi;

  const formValues = useStore(
    form.store,
    (state) => state.values as StockOpnameFormValues,
  );

  React.useEffect(() => {
    form.reset(buildDefaults());
  }, [buildDefaults, form]);

  const rows = React.useMemo<ParsedRow[]>(() => {
    return formValues.items.map((item) => {
      const parsedActual = Number.parseInt(item.actual || "0", 10);
      const actual = Number.isFinite(parsedActual) ? Math.max(0, parsedActual) : 0;
      const delta = actual - (item.currentStock ?? 0);
      return {
        ingredientId: item.ingredientId,
        name: item.name,
        baseUom: item.baseUom,
        currentStock: item.currentStock,
        actual,
        delta,
        minStock: item.minStock,
      };
    });
  }, [formValues.items]);

  const outstandingCount = React.useMemo(
    () => rows.filter((row) => row.delta !== 0).length,
    [rows],
  );

  const buildPayload = React.useCallback(
    (commit: boolean): CreateStockAdjustmentPayload => {
      return {
        notes: formValues.notes.trim(),
        commit,
        items: rows.map((row) => ({
          ingredientId: row.ingredientId,
          countedQty: row.actual,
        })),
      };
    },
    [rows, formValues.notes],
  );

  const submit = React.useCallback(
    async (commit: boolean) => {
      setStatusMessage(null);
      const notes = formValues.notes.trim();
      if (!notes) {
        setError("Notes are required for stock opname");
        return;
      }
      setError(null);
      try {
        const payload = buildPayload(commit);
        await mutation.mutateAsync(payload);
        const message = "Stock synced successfully";
        toast.success(message);
        setStatusMessage(message);
        form.setFieldValue("notes", "");
        form.setFieldValue(
          "items",
          formValues.items.map((item, index) => ({
            ...item,
            actual: rows[index]?.actual.toString() ?? item.actual,
            currentStock: rows[index]?.actual ?? item.currentStock,
          })),
        );
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "Failed to submit stock opname";
        toast.error(message);
      }
    },
    [buildPayload, form, formValues.items, formValues.notes, mutation, rows],
  );

  const resetCounts = React.useCallback(() => {
    setStatusMessage(null);
    form.setFieldValue(
      "items",
      formValues.items.map((item) => ({
        ...item,
        actual: String(item.currentStock ?? 0),
      })),
    );
  }, [form, formValues.items]);

  return {
    form,
    rows,
    outstandingCount,
    isSubmitting: mutation.isPending,
    error,
    statusMessage,
    resetCounts,
    submit: () => submit(true), // Always attempt commit
  };
}
