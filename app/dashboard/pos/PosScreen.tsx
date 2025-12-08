"use client";

import * as React from "react";

import { MenuPanel } from "./_components/menu-panel";
import { CartPanel } from "./_components/cart-panel";
import { PaymentDrawer } from "./_components/payment-drawer";
import { VariantSheet } from "./_components/variant-sheet";
import { usePosController } from "./_components/use-pos-controller";
import { usePosMenus, usePosResellers, usePosSettings } from "@/features/pos/hooks";

/**
 * POS Screen component that uses React Query hooks for data hydration
 * Data is prefetched on server and hydrated via HydrationBoundary
 */
export function PosScreen() {
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  
  // Use hooks to access hydrated data
  const { data: menus = [] } = usePosMenus();
  const { data: resellers = [] } = usePosResellers();
  const { data: settings } = usePosSettings();
  
  const defaultTaxRate = settings?.defaultTaxRate ?? 0.11;

  const controller = usePosController({
    menus,
    resellers,
    defaultTaxRate,
  });
  const {
    canSubmit,
    paymentDrawerOpen,
    paymentForm,
    variantDialog,
    setPaymentDrawerOpen,
    setVariantDialog,
  } = controller;
  const submitPaymentForm = React.useCallback(() => {
    void paymentForm.handleSubmit();
  }, [paymentForm]);

  React.useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.target as HTMLElement)?.tagName === "INPUT") {
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!paymentDrawerOpen) {
          if (canSubmit) {
            setPaymentDrawerOpen(true);
          }
        } else {
          submitPaymentForm();
        }
        return;
      }

      if (event.key === "Escape") {
        if (paymentDrawerOpen) {
          setPaymentDrawerOpen(false);
          return;
        }
        if (variantDialog) {
          setVariantDialog(null);
        }
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    canSubmit,
    paymentDrawerOpen,
    variantDialog,
    setPaymentDrawerOpen,
    setVariantDialog,
    submitPaymentForm,
  ]);

  return (
    <div className="space-y-5">
      <div
        className="grid gap-5 lg:grid-cols-[2fr_1fr] xl:grid-cols-[2fr_1fr]"
      >
        <MenuPanel
          searchInputRef={searchInputRef}
          searchTerm={controller.searchTerm}
          onSearchChange={controller.setSearchTerm}
          categoryFilter={controller.categoryFilter}
          onCategoryFilterChange={controller.setCategoryFilter}
          categoryOptions={controller.categoryOptions}
          totalMenuCount={controller.totalMenuCount}
          menus={controller.filteredMenus}
          onMenuClick={controller.handleMenuSelected}
          favoriteMenuIds={controller.favoriteMenuIds}
          onToggleFavorite={controller.handleToggleFavorite}
          isLoading={controller.isHydrating}
        />

          <CartPanel
            cart={controller.cartState}
            subtotal={controller.subtotal}
            discountAmount={controller.discountAmount}
            tax={controller.tax}
            grandTotal={controller.grandTotal}
            onChangeQuantity={(lineId, qty) => controller.updateCartQuantity(lineId, qty)}
            onRemove={controller.removeCartLine}
            onOpenPayment={() => controller.setPaymentDrawerOpen(true)}
            canSubmit={Boolean(controller.canSubmit)}
            isSubmitting={controller.isSubmittingOrder}
            paymentValues={controller.paymentValues}
            mode={controller.mode}
            onModeChange={controller.handleModeChange}
            resellers={resellers}
            selectedResellerId={controller.selectedResellerId}
            onSelectReseller={controller.handleSelectReseller}
            resellerQuery={controller.resellerQuery}
            onResellerQueryChange={controller.handleResellerQueryChange}
            onCustomerNameChange={controller.handleCustomerNameChange}
            onPaymentMethodChange={controller.handlePaymentMethodChange}
            onAmountReceivedChange={controller.handleAmountReceivedChange}
            onNoteChange={controller.handleNoteChange}
            isLoading={controller.isHydrating}
          />
      </div>

      <PaymentDrawer
        open={controller.paymentDrawerOpen}
        onOpenChange={controller.setPaymentDrawerOpen}
        totals={{
          subtotal: controller.subtotal,
          discount: controller.discountAmount,
          tax: controller.tax,
          grand: controller.grandTotal,
        }}
        canSubmit={Boolean(controller.canSubmit)}
        isSubmitting={controller.isSubmittingOrder}
        mode={controller.mode}
        resellerName={controller.selectedReseller?.name ?? null}
        paymentValues={controller.paymentValues}
        cart={controller.cartState}
        onConfirm={controller.submitPaymentForm}
        onBypass={controller.submitPaymentWithBypass}
        onPaymentStatusChange={controller.handlePaymentStatusChange}
        onDueDateChange={controller.handleDueDateChange}
      />

      <VariantSheet
        state={controller.variantDialog}
        onClose={() => controller.setVariantDialog(null)}
        onSelect={(option, menu) => controller.handleConfirmVariant(option, menu)}
      />
    </div>
  );
}

