'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { RecipeForm } from '../RecipeForm';
import { mapRecipeToFormValues } from '@/features/recipes/utils';
import type { RecipeListItem } from '@/features/recipes/types';
import type { RecipeInput } from '@/features/recipes/client';

type RecipeFormDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  recipe: RecipeListItem | null;
  menus: Array<{ id: string; name: string }>;
  ingredients: Array<{ id: string; name: string; baseUom: string }>;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: RecipeInput) => Promise<void>;
};

export function RecipeFormDialog({
  open,
  mode,
  recipe,
  menus,
  ingredients,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: RecipeFormDialogProps) {
  const initialValues = React.useMemo(
    () => (recipe ? mapRecipeToFormValues(recipe) : null),
    [recipe],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="space-y-1">
          <DialogTitle>
            {mode === 'create' ? 'Create Recipe' : 'Edit Recipe'}
          </DialogTitle>
          <DialogDescription>
            Update recipe details, ingredients, and method steps for the selected menu item.
          </DialogDescription>
        </DialogHeader>

        <RecipeForm
          mode={mode}
          menus={menus}
          ingredients={ingredients}
          loading={isSubmitting}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          initialValues={initialValues}
        />
      </DialogContent>
    </Dialog>
  );
}
