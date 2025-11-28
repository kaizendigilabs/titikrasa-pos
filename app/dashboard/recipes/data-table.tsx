'use client';

import { DataTable } from '@/components/tables/data-table';
import { DataTableToolbar } from '@/components/tables/data-table-toolbar';
import {
  RecipesRealtimeBridge,
  useRecipesTableController,
  type RecipesTableFilters,
  type UseRecipesTableControllerArgs,
} from './_components/use-recipes-table';
import { RecipeFormDialog } from './_components/recipe-form-sheet';
import { RecipeDetail } from './_components/recipe-detail';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type RecipesTableProps = UseRecipesTableControllerArgs;

export function RecipesTable(props: RecipesTableProps) {
  const controller = useRecipesTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Loading recipes..."
      emptyMessage="No recipes found."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={(context) => (
        <>
          <Sheet
            open={Boolean(controller.detail.recipe)}
            onOpenChange={(open) => {
              if (!open) {
                controller.detail.onClose();
              }
            }}
          >
            <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
              {controller.detail.recipe ? (
                <RecipeDetail
                  recipe={controller.detail.recipe}
                  canManage={controller.detail.canManage}
                  onEdit={controller.detail.onEdit}
                  onDelete={controller.detail.onDelete}
                />
              ) : null}
            </SheetContent>
          </Sheet>

          <RecipeFormDialog {...controller.formDialogProps} />

          <AlertDialog
            open={Boolean(controller.deleteDialog.state)}
            onOpenChange={(open) => {
              if (!open) {
                controller.deleteDialog.onCancel();
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete recipe</AlertDialogTitle>
                <AlertDialogDescription>
                  {controller.deleteDialog.state
                    ? `This will permanently delete recipe for ${controller.deleteDialog.state.recipe.menuName}.`
                    : 'This action cannot be undone.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={controller.deleteDialog.isPending}
                  onClick={controller.deleteDialog.onCancel}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={controller.deleteDialog.isPending}
                  onClick={() => void controller.deleteDialog.onConfirm()}
                >
                  {controller.deleteDialog.isPending ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <RecipesRealtimeBridge
            filters={context.filters as RecipesTableFilters}
          />
        </>
      )}
    />
  );
}
