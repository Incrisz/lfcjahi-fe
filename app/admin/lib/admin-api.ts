import { CategoryItem, EventItem, MediaItem, ThemeSettings } from "./admin-store";

type ApiEnvelope<T> = {
  data: T;
};

function getApiBaseUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!value) {
    return null;
  }

  return value.replace(/\/+$/, "");
}

function buildApiUrl(path: string): string | null {
  const base = getApiBaseUrl();
  if (!base) {
    return null;
  }

  return `${base}${path}`;
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export function hasApiBaseUrl(): boolean {
  return Boolean(getApiBaseUrl());
}

export async function fetchCategoriesApi(): Promise<CategoryItem[] | null> {
  const url = buildApiUrl("/api/admin/categories");
  if (!url) {
    return null;
  }

  const response = await fetch(url);
  return parseEnvelope<CategoryItem[]>(response);
}

export async function createCategoryApi(name: string): Promise<CategoryItem | null> {
  const url = buildApiUrl("/api/admin/categories");
  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return parseEnvelope<CategoryItem>(response);
}

export async function updateCategoryApi(id: string, name: string): Promise<CategoryItem | null> {
  const url = buildApiUrl(`/api/admin/categories/${id}`);
  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return parseEnvelope<CategoryItem>(response);
}

export async function deleteCategoryApi(id: string): Promise<boolean> {
  const url = buildApiUrl(`/api/admin/categories/${id}`);
  if (!url) {
    return false;
  }

  const response = await fetch(url, { method: "DELETE" });
  return response.ok;
}

export async function createSubcategoryApi(categoryId: string, name: string): Promise<{ id: string; name: string } | null> {
  const url = buildApiUrl(`/api/admin/categories/${categoryId}/subcategories`);
  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return parseEnvelope<{ id: string; name: string }>(response);
}

export async function updateSubcategoryApi(subcategoryId: string, name: string): Promise<{ id: string; name: string } | null> {
  const url = buildApiUrl(`/api/admin/subcategories/${subcategoryId}`);
  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return parseEnvelope<{ id: string; name: string }>(response);
}

export async function deleteSubcategoryApi(subcategoryId: string): Promise<boolean> {
  const url = buildApiUrl(`/api/admin/subcategories/${subcategoryId}`);
  if (!url) {
    return false;
  }

  const response = await fetch(url, { method: "DELETE" });
  return response.ok;
}

export async function fetchMediaItemsApi(): Promise<MediaItem[] | null> {
  const url = buildApiUrl("/api/admin/media");

  if (!url) {
    return null;
  }

  const response = await fetch(url);
  return parseEnvelope<MediaItem[]>(response);
}

type SaveMediaInput = {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  speaker: string;
  mediaDate: string;
  mediaSourceType: "link" | "file" | "";
  mediaUrl: string;
  thumbnailUrl: string;
  thumbnailFile: File | null;
  audioFile: File | null;
};

export async function saveMediaItemApi(input: SaveMediaInput, id?: string): Promise<MediaItem | null> {
  const createUrl = buildApiUrl("/api/admin/media");
  const updateUrl = id ? buildApiUrl(`/api/admin/media/${id}`) : null;

  if (!createUrl || (id && !updateUrl)) {
    return null;
  }

  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("category", input.category);
  formData.append("subcategory", input.subcategory);
  formData.append("speaker", input.speaker);
  formData.append("media_date", input.mediaDate);
  formData.append("media_url", input.mediaUrl);
  formData.append("media_source_type", input.mediaSourceType);
  formData.append("thumbnail_url", input.thumbnailUrl);

  if (input.thumbnailFile) {
    formData.append("thumbnail_file", input.thumbnailFile);
  }

  if (input.audioFile) {
    formData.append("audio_file", input.audioFile);
  }

  let response: Response;

  if (id) {
    formData.append("_method", "PUT");
    response = await fetch(updateUrl as string, {
      method: "POST",
      body: formData,
    });
  } else {
    response = await fetch(createUrl, {
      method: "POST",
      body: formData,
    });
  }

  return parseEnvelope<MediaItem>(response);
}

export async function deleteMediaItemApi(id: string): Promise<boolean> {
  const url = buildApiUrl(`/api/admin/media/${id}`);
  if (!url) {
    return false;
  }

  const response = await fetch(url, { method: "DELETE" });
  return response.ok;
}

export async function fetchEventsApi(): Promise<EventItem[] | null> {
  const url = buildApiUrl("/api/admin/events");

  if (!url) {
    return null;
  }

  const response = await fetch(url);
  return parseEnvelope<EventItem[]>(response);
}

type SaveEventInput = {
  name: string;
  eventDate: string;
  description: string;
  mediaUrl: string;
  registrationEnabled: boolean;
};

export async function saveEventApi(input: SaveEventInput, id?: string): Promise<EventItem | null> {
  const createUrl = buildApiUrl("/api/admin/events");
  const updateUrl = id ? buildApiUrl(`/api/admin/events/${id}`) : null;

  if (!createUrl || (id && !updateUrl)) {
    return null;
  }

  const body = JSON.stringify(input);

  const response = await fetch(id ? (updateUrl as string) : createUrl, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return parseEnvelope<EventItem>(response);
}

export async function deleteEventApi(id: string): Promise<boolean> {
  const url = buildApiUrl(`/api/admin/events/${id}`);
  if (!url) {
    return false;
  }

  const response = await fetch(url, { method: "DELETE" });
  return response.ok;
}

export async function fetchThemeSettingsApi(): Promise<ThemeSettings | null> {
  const url = buildApiUrl("/api/admin/theme-settings");

  if (!url) {
    return null;
  }

  const response = await fetch(url);
  return parseEnvelope<ThemeSettings>(response);
}

export async function saveThemeSettingsApi(settings: ThemeSettings): Promise<ThemeSettings | null> {
  const url = buildApiUrl("/api/admin/theme-settings");

  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });

  return parseEnvelope<ThemeSettings>(response);
}

type BlogPostPayload = {
  title: string;
  excerpt: string;
  content: string;
  publishDate: string;
  status: "draft" | "published";
};

export async function createBlogPostApi(payload: BlogPostPayload): Promise<boolean> {
  const url = buildApiUrl("/api/admin/blog-posts");

  if (!url) {
    return false;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return response.ok;
}
