// Hardcoded Help Categories - always available regardless of database state
import { DEFAULT_HELP_CATEGORIES } from "@/types/help";

export interface HardcodedCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { posts: number };
}

// Generate hardcoded categories from defaults
export const HARDCODED_CATEGORIES: HardcodedCategory[] = DEFAULT_HELP_CATEGORIES.map((cat, index) => ({
  id: `cat_${cat.slug}`,
  name: cat.name,
  slug: cat.slug,
  icon: cat.icon,
  color: cat.color,
  description: cat.description,
  sortOrder: index,
  isActive: true,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { posts: 0 },
}));

// Check if a category ID is a hardcoded one
export function isHardcodedCategoryId(id: string): boolean {
  return id.startsWith("cat_");
}

// Get hardcoded category by ID
export function getHardcodedCategoryById(id: string): HardcodedCategory | undefined {
  return HARDCODED_CATEGORIES.find(c => c.id === id);
}

// Get hardcoded category by slug
export function getHardcodedCategoryBySlug(slug: string): HardcodedCategory | undefined {
  return HARDCODED_CATEGORIES.find(c => c.slug === slug);
}

// Get real category ID from hardcoded ID (for database operations)
// Returns the slug which can be used to find/create the category in DB
export function getSlugFromHardcodedId(id: string): string | null {
  if (!id.startsWith("cat_")) return null;
  return id.replace("cat_", "");
}
