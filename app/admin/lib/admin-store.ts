export type MediaCategory = string;

export type CategorySubcategory = {
  id: string;
  name: string;
};

export type CategoryItem = {
  id: string;
  name: string;
  subcategories: CategorySubcategory[];
};

export type MediaItem = {
  id: string;
  title: string;
  description: string;
  category: MediaCategory;
  subcategory: string;
  speaker: string;
  mediaDate: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaSourceType?: "link" | "file" | "";
  isPublished: boolean;
  createdAt: string;
};

export type EventItem = {
  id: string;
  name: string;
  eventDate: string;
  description: string;
  mediaUrl: string;
  registrationEnabled: boolean;
  createdAt: string;
};

export type ThemeSettings = {
  churchName: string;
  logoUrl: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  layoutStyle: "standard" | "wide" | "compact";
};

const MEDIA_KEY = "lfcjahi_admin_media_items";
const EVENTS_KEY = "lfcjahi_admin_events";
const THEME_KEY = "lfcjahi_admin_theme_settings";
const CATEGORY_TREE_KEY = "lfcjahi_admin_category_tree";

export const AUTH_KEY = "lfcjahi_admin_auth";
export const USER_KEY = "lfcjahi_admin_user";

export const DEFAULT_CATEGORY_TREE: CategoryItem[] = [
  {
    id: "default-videos",
    name: "Videos",
    subcategories: [
      { id: "default-videos-sermons", name: "Sermons" },
      { id: "default-videos-events", name: "Event Videos" },
    ],
  },
  {
    id: "default-audio",
    name: "Audio",
    subcategories: [
      { id: "default-audio-sermon", name: "Sermon Audio" },
      { id: "default-audio-podcast", name: "Podcasts" },
    ],
  },
  {
    id: "default-photos",
    name: "Photos",
    subcategories: [
      { id: "default-photos-events", name: "Church Events" },
      { id: "default-photos-celebrations", name: "Celebrations" },
    ],
  },
  {
    id: "default-downloads",
    name: "Downloads",
    subcategories: [
      { id: "default-downloads-bulletins", name: "Bulletins" },
      { id: "default-downloads-flyers", name: "Flyers" },
    ],
  },
];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  churchName: "LFC Jahi",
  logoUrl: "",
  tagline: "Raising Kingdom Voices",
  primaryColor: "#0a4d68",
  accentColor: "#f2994a",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  layoutStyle: "standard",
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function normalizeCategoryTree(tree: CategoryItem[]): CategoryItem[] {
  return tree
    .filter((entry) => entry && entry.name)
    .map((entry, index) => ({
      id: entry.id || `local-category-${index}`,
      name: entry.name.trim(),
      subcategories: (entry.subcategories || [])
        .filter((sub) => sub && sub.name)
        .map((sub, subIndex) => ({
          id: sub.id || `local-sub-${index}-${subIndex}`,
          name: sub.name.trim(),
        })),
    }))
    .filter((entry) => entry.name.length > 0);
}

export function loadCategoryTree(): CategoryItem[] {
  if (!canUseStorage()) {
    return DEFAULT_CATEGORY_TREE;
  }

  const data = parseJson<CategoryItem[]>(window.localStorage.getItem(CATEGORY_TREE_KEY), DEFAULT_CATEGORY_TREE);
  const normalized = normalizeCategoryTree(data);

  return normalized.length ? normalized : DEFAULT_CATEGORY_TREE;
}

export function saveCategoryTree(items: CategoryItem[]): void {
  if (!canUseStorage()) {
    return;
  }

  const normalized = normalizeCategoryTree(items);
  window.localStorage.setItem(CATEGORY_TREE_KEY, JSON.stringify(normalized));
}

export function getCategoryNames(tree: CategoryItem[]): string[] {
  return tree.map((entry) => entry.name);
}

export function getSubcategoryNames(tree: CategoryItem[], categoryName: string): string[] {
  const category = tree.find((entry) => entry.name === categoryName);
  if (!category) {
    return [];
  }

  return category.subcategories.map((entry) => entry.name);
}

export function loadMediaItems(): MediaItem[] {
  if (!canUseStorage()) {
    return [];
  }

  const items = parseJson<MediaItem[]>(window.localStorage.getItem(MEDIA_KEY), []);

  return items
    .filter((item) => item && item.id && item.title)
    .map((item) => ({
      ...item,
      isPublished: item.isPublished !== false,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveMediaItems(items: MediaItem[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(MEDIA_KEY, JSON.stringify(items));
}

export function loadEvents(): EventItem[] {
  if (!canUseStorage()) {
    return [];
  }

  const items = parseJson<EventItem[]>(window.localStorage.getItem(EVENTS_KEY), []);

  return items
    .filter((item) => item && item.id && item.name)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

export function saveEvents(items: EventItem[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(items));
}

export function loadThemeSettings(): ThemeSettings {
  if (!canUseStorage()) {
    return DEFAULT_THEME_SETTINGS;
  }

  const settings = parseJson<ThemeSettings>(window.localStorage.getItem(THEME_KEY), DEFAULT_THEME_SETTINGS);

  return {
    ...DEFAULT_THEME_SETTINGS,
    ...settings,
  };
}

export function saveThemeSettings(settings: ThemeSettings): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(THEME_KEY, JSON.stringify(settings));
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}
