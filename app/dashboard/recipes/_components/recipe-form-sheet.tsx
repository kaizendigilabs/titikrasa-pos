'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { RecipeForm } from '../RecipeForm';
import { mapRecipeToFormValues } from '@/features/recipes/utils';
import type { RecipeListItem } from '@/features/recipes/types';
import type { RecipeInput } from '@/features/recipes/client';

type RecipeFormSheetProps = {
  open: boolean;
  mode: 'create' | 'edit';
  recipe: RecipeListItem | null;
  menus: Array<{ id: string; name: string }>;
  ingredients: Array<{ id: string; name: string; baseUom: string }>;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: RecipeInput) => Promise<void>;
};

export function RecipeFormSheet({
  open,
  mode,
  recipe,
  menus,
  ingredients,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: RecipeFormSheetProps) {
  const initialValues = React.useMemo(
    () => (recipe ? mapRecipeToFormValues(recipe) : null),
    [recipe],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="space-y-1">
          <SheetTitle>
            {mode === 'create' ? 'Create Recipe' : 'Edit Recipe'}
          </SheetTitle>
          <SheetDescription>
            Update recipe details, ingredients, and method steps for the selected menu item.
          </SheetDescription>
        </SheetHeader>

        <RecipeForm
          mode={mode}
          menus={menus}
          ingredients={ingredients}
          loading={isSubmitting}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          initialValues={initialValues}
        />
      </SheetContent>
    </Sheet>
  );
}
