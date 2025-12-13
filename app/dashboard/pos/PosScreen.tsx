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
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/formatters";

export function PosScreen() {
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = React.useState(false);
  
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

  const cartPanelProps = {
    cart: controller.cartState,
    subtotal: controller.subtotal,
    discountAmount: controller.discountAmount,
    tax: controller.tax,
    grandTotal: controller.grandTotal,
    onChangeQuantity: (lineId: string, qty: number) => controller.updateCartQuantity(lineId, qty),
    onRemove: controller.removeCartLine,
    onOpenPayment: () => controller.setPaymentDrawerOpen(true),
    canSubmit: Boolean(controller.canSubmit),
    isSubmitting: controller.isSubmittingOrder,
    paymentValues: controller.paymentValues,
    mode: controller.mode,
    onModeChange: controller.handleModeChange,
    resellers: resellers,
    selectedResellerId: controller.selectedResellerId,
    onSelectReseller: controller.handleSelectReseller,
    resellerQuery: controller.resellerQuery,
    onResellerQueryChange: controller.handleResellerQueryChange,
    onCustomerNameChange: controller.handleCustomerNameChange,
    onPaymentMethodChange: controller.handlePaymentMethodChange,
    onAmountReceivedChange: controller.handleAmountReceivedChange,
    onNoteChange: controller.handleNoteChange,
    isLoading: controller.isHydrating,
  };

  const totalItems = controller.cartState.lines.reduce((acc, line) => acc + line.qty, 0);

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden lg:overflow-visible">
      {/* Scrollable Main Area for Mobile */}
      <div className="h-full overflow-y-auto p-4 lg:h-auto">
        <div className="grid h-full gap-5 pb-24 lg:grid-cols-[2fr_1fr] lg:pb-0 xl:grid-cols-[2fr_1fr]">
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
          
          {/* Desktop Cart */}
          <div className="hidden lg:block">
             <CartPanel {...cartPanelProps} />
          </div>
        </div>
      </div>

      {/* Mobile Cart Floating Bar */}
      <div className="fixed  bottom-0 left-0 right-0 z-20 border-t bg-background/80 p-4 backdrop-blur-lg lg:hidden">
        <div className="mx-auto max-w-md">
          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetTrigger asChild>
              <Button size="lg" className="w-full rounded-full shadow-lg">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground text-xs font-bold text-primary">
                      {totalItems}
                    </div>
                    <span>Item</span>
                  </div>
                  <span className="font-bold">
                    Total {formatCurrency(controller.grandTotal)}
                  </span>
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
               <div className="sr-only">
                 <SheetTitle>Shopping Cart</SheetTitle>
               </div>
              <div className="h-full overflow-y-auto px-4 py-6">
                <CartPanel 
                  {...cartPanelProps} 
                  className="border-none shadow-none lg:sticky lg:top-4" // Override sticky for mobile drawer
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
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

