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

export type SpeakerItem = {
  id: string;
  name: string;
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

export type DirectoryCellItem = {
  id: string;
  name: string;
  sortOrder: number;
  address: string;
  minister: string;
  phone: string;
};

export type DirectoryZoneItem = {
  id: string;
  name: string;
  sortOrder: number;
  zoneMinister: string;
  cells: DirectoryCellItem[];
};

export type DirectoryDistrictItem = {
  id: string;
  name: string;
  sortOrder: number;
  coverageAreas: string;
  homeCellPastors: string[];
  homeCellMinister: string;
  outreachPastor: string;
  outreachMinister: string;
  outreachLocation: string;
  zones: DirectoryZoneItem[];
};

const MEDIA_KEY = "lfcjahi_admin_media_items";
const EVENTS_KEY = "lfcjahi_admin_events";
const THEME_KEY = "lfcjahi_admin_theme_settings";
const CATEGORY_TREE_KEY = "lfcjahi_admin_category_tree";
const SPEAKERS_KEY = "lfcjahi_admin_speakers";
const DISTRICT_DIRECTORY_KEY = "lfcjahi_admin_district_directory";

export const AUTH_KEY = "lfcjahi_admin_auth";
export const USER_KEY = "lfcjahi_admin_user";
export const AUTH_EXPIRY_KEY = "lfcjahi_admin_auth_expires_at";
export const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

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

export function clearAdminSession(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(AUTH_EXPIRY_KEY);
}

export function setAdminSession(username: string): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_KEY, "true");
  window.localStorage.setItem(USER_KEY, username.trim());
  window.localStorage.setItem(AUTH_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
}

export function isAdminSessionActive(): boolean {
  if (!canUseStorage()) {
    return false;
  }

  const isAuthenticated = window.localStorage.getItem(AUTH_KEY) === "true";
  const expiresAt = Number(window.localStorage.getItem(AUTH_EXPIRY_KEY) || "0");

  if (!isAuthenticated || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearAdminSession();
    return false;
  }

  return true;
}

export function getStoredAdminName(): string {
  if (!canUseStorage()) {
    return "";
  }

  if (!isAdminSessionActive()) {
    return "";
  }

  return window.localStorage.getItem(USER_KEY) || "";
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

function normalizeSpeakers(items: SpeakerItem[]): SpeakerItem[] {
  return items
    .filter((entry) => entry && entry.name)
    .map((entry, index) => ({
      id: entry.id || `local-speaker-${index}`,
      name: entry.name.trim(),
    }))
    .filter((entry) => entry.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeDirectory(items: DirectoryDistrictItem[]): DirectoryDistrictItem[] {
  return items
    .filter((district) => district && district.name)
    .map((district, districtIndex) => ({
      id: district.id || `local-district-${districtIndex}`,
      name: district.name.trim(),
      sortOrder: Number.isFinite(Number(district.sortOrder)) ? Number(district.sortOrder) : districtIndex + 1,
      coverageAreas: (district.coverageAreas || "").trim(),
      homeCellPastors: Array.isArray(district.homeCellPastors)
        ? district.homeCellPastors.map((item) => String(item || "").trim()).filter(Boolean)
        : [],
      homeCellMinister: (district.homeCellMinister || "").trim(),
      outreachPastor: (district.outreachPastor || "").trim(),
      outreachMinister: (district.outreachMinister || "").trim(),
      outreachLocation: (district.outreachLocation || "").trim(),
      zones: Array.isArray(district.zones)
        ? district.zones
            .filter((zone) => zone && zone.name)
            .map((zone, zoneIndex) => ({
              id: zone.id || `local-zone-${districtIndex}-${zoneIndex}`,
              name: zone.name.trim(),
              sortOrder: Number.isFinite(Number(zone.sortOrder)) ? Number(zone.sortOrder) : zoneIndex + 1,
              zoneMinister: (zone.zoneMinister || "").trim(),
              cells: Array.isArray(zone.cells)
                ? zone.cells
                    .filter((cell) => cell && cell.name)
                    .map((cell, cellIndex) => ({
                      id: cell.id || `local-cell-${districtIndex}-${zoneIndex}-${cellIndex}`,
                      name: cell.name.trim(),
                      sortOrder: Number.isFinite(Number(cell.sortOrder)) ? Number(cell.sortOrder) : cellIndex + 1,
                      address: (cell.address || "").trim(),
                      minister: (cell.minister || "").trim(),
                      phone: (cell.phone || "").trim(),
                    }))
                    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                : [],
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        : [],
    }))
    .filter((district) => district.name.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
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

export function loadSpeakers(): SpeakerItem[] {
  if (!canUseStorage()) {
    return [];
  }

  const stored = parseJson<SpeakerItem[]>(window.localStorage.getItem(SPEAKERS_KEY), []);
  const normalizedStored = normalizeSpeakers(stored);
  if (normalizedStored.length > 0) {
    return normalizedStored;
  }

  const mediaSpeakers = parseJson<MediaItem[]>(window.localStorage.getItem(MEDIA_KEY), [])
    .map((item) => (item?.speaker || "").trim())
    .filter(Boolean)
    .filter((name, index, values) => values.indexOf(name) === index)
    .map((name, index) => ({
      id: `derived-speaker-${index}`,
      name,
    }));

  return normalizeSpeakers(mediaSpeakers);
}

export function saveSpeakers(items: SpeakerItem[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SPEAKERS_KEY, JSON.stringify(normalizeSpeakers(items)));
}

export function getSpeakerNames(items: SpeakerItem[]): string[] {
  return normalizeSpeakers(items).map((entry) => entry.name);
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

export function loadDistrictDirectory(): DirectoryDistrictItem[] {
  if (!canUseStorage()) {
    return [];
  }

  const items = parseJson<DirectoryDistrictItem[]>(window.localStorage.getItem(DISTRICT_DIRECTORY_KEY), []);
  return normalizeDirectory(items);
}

export function saveDistrictDirectory(items: DirectoryDistrictItem[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(DISTRICT_DIRECTORY_KEY, JSON.stringify(normalizeDirectory(items)));
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}
