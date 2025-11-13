'use client';

import { IconPencil, IconTrash } from '@tabler/icons-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { formatNumber } from '@/lib/utils/formatters';
import type { RecipeListItem } from '@/features/recipes/types';

type RecipeDetailProps = {
  recipe: RecipeListItem;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function RecipeDetail({
  recipe,
  canManage,
  onEdit,
  onDelete,
}: RecipeDetailProps) {
  return (
    <div className="flex h-full flex-col gap-6">
      <SheetHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle>{recipe.menuName}</SheetTitle>
            <SheetDescription>
              Version {recipe.version} · Effective{' '}
              {format(new Date(recipe.effectiveFrom), 'dd MMM yyyy')}
            </SheetDescription>
          </div>
          {canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <IconPencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <IconTrash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      </SheetHeader>

      <Tabs defaultValue="ingredients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="method">Method</TabsTrigger>
          <TabsTrigger value="overrides">Variant Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="space-y-4">
          {recipe.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ingredients registered for this recipe.
            </p>
          ) : (
            <ul className="space-y-2">
              {recipe.items.map((item) => (
                <li
                  key={`${item.ingredientId}-${item.uom}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-foreground">
                      {item.ingredientName ?? 'Unnamed ingredient'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID: {item.ingredientId}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {formatNumber(item.quantity, 3)} {item.uom || 'unit'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="method" className="space-y-3">
          {recipe.methodSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No method steps documented.
            </p>
          ) : (
            <ol className="space-y-3">
              {recipe.methodSteps.map((step) => (
                <li key={step.step_no} className="rounded-md border p-3">
                  <p className="font-medium text-sm text-foreground">
                    Step {step.step_no}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {step.instruction}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="overrides" className="space-y-3">
          {recipe.overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No variant overrides recorded.
            </p>
          ) : (
            <div className="space-y-4">
              {recipe.overrides.map((override) => (
                <div
                  key={`${override.size}-${override.temperature}`}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      Size: {override.size.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      Temp: {override.temperature.toUpperCase()}
                    </Badge>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {override.items.map((item) => (
                      <li
                        key={`${item.ingredientId}-${item.uom}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{item.ingredientName ?? item.ingredientId}</span>
                        <span className="text-muted-foreground">
                          {formatNumber(item.quantity, 3)} {item.uom || 'unit'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
