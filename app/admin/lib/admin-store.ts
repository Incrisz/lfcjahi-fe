export type MediaCategory = "Videos" | "Audio" | "Photos" | "Downloads";

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

export const AUTH_KEY = "lfcjahi_admin_auth";
export const USER_KEY = "lfcjahi_admin_user";

export const MEDIA_CATEGORIES: MediaCategory[] = ["Videos", "Audio", "Photos", "Downloads"];

export const MEDIA_SUBCATEGORIES: Record<MediaCategory, string[]> = {
  Videos: ["Sermons", "Event Videos"],
  Audio: ["Sermon Audio", "Podcasts"],
  Photos: ["Church Events", "Celebrations"],
  Downloads: ["Bulletins", "Flyers"],
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  churchName: "LFC Jahi",
  logoUrl: "/assets/images/logo-1.png",
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

export function loadMediaItems(): MediaItem[] {
  if (!canUseStorage()) {
    return [];
  }

  const items = parseJson<MediaItem[]>(window.localStorage.getItem(MEDIA_KEY), []);

  return items
    .filter((item) => item && item.id && item.title)
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
