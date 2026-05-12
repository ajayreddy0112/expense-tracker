// Visual metadata for categories, keyed by the canonical name in the DB.
// The category row carries `name` + `icon`; color lives here so the design
// can evolve independently of seed data.

export type CategoryMeta = {
  color: string;
  fallbackIcon: string;
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  Food:          { color: "oklch(66% 0.17 35)",  fallbackIcon: "🍜" },
  Transport:     { color: "oklch(60% 0.14 240)", fallbackIcon: "🚇" },
  Bills:         { color: "oklch(56% 0.16 295)", fallbackIcon: "🧾" },
  Entertainment: { color: "oklch(64% 0.17 340)", fallbackIcon: "🎬" },
  Shopping:      { color: "oklch(70% 0.15 80)",  fallbackIcon: "🛍️" },
  Health:        { color: "oklch(60% 0.14 155)", fallbackIcon: "💊" },
  Other:         { color: "oklch(55% 0.02 260)", fallbackIcon: "📦" },
};

const DEFAULT: CategoryMeta = { color: "oklch(55% 0.02 260)", fallbackIcon: "📦" };

export function metaFor(name: string | null | undefined): CategoryMeta {
  if (!name) return DEFAULT;
  return CATEGORY_META[name] ?? DEFAULT;
}
