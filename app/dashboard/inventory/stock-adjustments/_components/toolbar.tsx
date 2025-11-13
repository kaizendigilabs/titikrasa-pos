"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { UseStockOpnameControllerResult } from "./use-stock-opname";

type StockOpnameToolbarProps = {
  controller: UseStockOpnameControllerResult;
};

export function StockOpnameToolbar({ controller }: StockOpnameToolbarProps) {
  const {
    form,
    outstandingCount,
    isSubmitting,
    resetCounts,
    submit,
    commitMode,
    setCommitMode,
    error,
    statusMessage,
    canCommit,
  } = controller;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border/60 p-4">
      <p className="text-sm text-muted-foreground">
        {outstandingCount} item(s) differ from system stock. Isi stok aktual,
        tambahkan catatan, lalu simpan sebagai draft atau langsung commit jika Anda memiliki izin.
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium uppercase text-muted-foreground">
            Mode
          </Label>
          <ToggleGroup
            type="single"
            value={commitMode}
            onValueChange={(value) => {
              if (!value) return;
              setCommitMode(value as "draft" | "commit");
            }}
            size="sm"
            className="mt-2"
          >
            <ToggleGroupItem value="draft">Draft</ToggleGroupItem>
            <ToggleGroupItem value="commit" disabled={!canCommit}>
              Commit
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stock-notes">Notes</Label>
          <form.Field name="notes">
            {(field: any) => (
              <textarea
                id="stock-notes"
                className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Catatan wajib untuk setiap stock opname"
                value={(field.state.value as string) ?? ""}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  field.handleChange(event.target.value)
                }
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {statusMessage ? (
          <p className="text-xs text-emerald-600">{statusMessage}</p>
        ) : null}
      </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={resetCounts} disabled={isSubmitting}>
          Reset counts
        </Button>
        <Button
          size="sm"
          onClick={submit}
          disabled={isSubmitting || (commitMode === "commit" && !canCommit)}
        >
          {isSubmitting
            ? "Submitting..."
            : commitMode === "commit"
              ? "Commit stock"
              : "Save draft"}
        </Button>
      </div>
    </div>
  );
}
