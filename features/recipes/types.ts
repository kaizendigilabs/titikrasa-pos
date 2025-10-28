export type RecipeItem = {
  ingredientId: string;
  ingredientName: string | null;
  quantity: number;
  uom: string;
};

export type RecipeMethodStep = {
  step_no: number;
  instruction: string;
};

export type RecipeVariantOverride = {
  size: string;
  temperature: string;
  items: RecipeItem[];
};

export type RecipeListItem = {
  id: string;
  menuId: string;
  menuName: string;
  menuThumbnail: string | null;
  version: number;
  effectiveFrom: string;
  items: RecipeItem[];
  methodSteps: RecipeMethodStep[];
  overrides: RecipeVariantOverride[];
  createdAt: string;
  updatedAt: string | null;
};

export type RecipeFilters = {
  search?: string | null;
  menuId?: string | null;
  limit?: number;
};

export type RecipeListResponse = {
  recipes: RecipeListItem[];
};
