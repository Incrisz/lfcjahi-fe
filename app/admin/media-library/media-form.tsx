"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin-pages.module.css";
import AdminShell from "../components/admin-shell";
import {
  MediaCategory,
  MediaItem,
  createId,
  getCategoryNames,
  getSubcategoryNames,
  loadCategoryTree,
  loadMediaItems,
  saveCategoryTree,
  saveMediaItems,
} from "../lib/admin-store";
import { fetchCategoriesApi, fetchMediaItemsApi, hasApiBaseUrl, saveMediaItemApi } from "../lib/admin-api";

type AudioSourceMode = "link" | "file";

type MediaFormProps = {
  mediaId?: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function isAudioCategory(category: string): boolean {
  return category.trim().toLowerCase() === "audio";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default function MediaForm({ mediaId }: MediaFormProps) {
  const router = useRouter();
  const isEditing = Boolean(mediaId);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [categoryTree, setCategoryTree] = useState(loadCategoryTree);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [mediaDate, setMediaDate] = useState("");
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState("");
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState("");
  const [audioSourceMode, setAudioSourceMode] = useState<AudioSourceMode>("link");
  const [audioLink, setAudioLinkInternal] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [category, setCategory] = useState<MediaCategory>("");
  const [subcategory, setSubcategory] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Ensure audioLink is always a string to prevent controlled/uncontrolled input issues
  const setAudioLink = (value: string | ((prev: string) => string)) => {
    if (typeof value === "function") {
      setAudioLinkInternal((prev) => asString(value(asString(prev))));
    } else {
      setAudioLinkInternal(asString(value));
    }
  };

  const normalizedAudioLink = asString(audioLink);

  useEffect(() => {
    let isActive = true;

    async function initializePage() {
      let nextCategoryTree = loadCategoryTree();
      let nextMediaItems = loadMediaItems();

      try {
        const [remoteCategories, remoteMediaItems] = await Promise.all([
          fetchCategoriesApi(),
          fetchMediaItemsApi(),
        ]);

        if (!isActive) {
          return;
        }

        if (remoteCategories && remoteCategories.length > 0) {
          nextCategoryTree = remoteCategories;
          saveCategoryTree(remoteCategories);
        }

        if (remoteMediaItems) {
          nextMediaItems = remoteMediaItems;
          saveMediaItems(remoteMediaItems);
        }
      } catch {
        // keep local fallback state
      }

      if (!isActive) {
        return;
      }

      setCategoryTree(nextCategoryTree);
      setMediaItems(nextMediaItems);

      const categoryOptions = getCategoryNames(nextCategoryTree);
      const fallbackCategory = categoryOptions[0] || "";

      if (!mediaId) {
        const fallbackSubcategory = getSubcategoryNames(nextCategoryTree, fallbackCategory)[0] || "";
        setCategory(fallbackCategory);
        setSubcategory(fallbackSubcategory);
        setIsReady(true);
        return;
      }

      const item = nextMediaItems.find((entry) => entry.id === mediaId);
      if (!item) {
        setStatus("Media item not found.");
        setCategory(fallbackCategory);
        setSubcategory(getSubcategoryNames(nextCategoryTree, fallbackCategory)[0] || "");
        setIsReady(true);
        return;
      }

      const itemCategory = categoryOptions.includes(item.category) ? item.category : fallbackCategory;
      const subcategoryOptions = getSubcategoryNames(nextCategoryTree, itemCategory);
      const itemSubcategory =
        subcategoryOptions.includes(item.subcategory) || item.subcategory.trim() === ""
          ? item.subcategory
          : subcategoryOptions[0] || "";

      setTitle(asString(item.title));
      setDescription(asString(item.description));
      setSpeaker(asString(item.speaker));
      setMediaDate(asString(item.mediaDate));
      setExistingThumbnailUrl(asString(item.thumbnailUrl));
      setThumbnailPreviewUrl(asString(item.thumbnailUrl));
      setThumbnailFile(null);
      setExistingMediaUrl(asString(item.mediaUrl));

      if (isAudioCategory(item.category)) {
        const mode = item.mediaSourceType === "file" ? "file" : "link";
        setAudioSourceMode(mode);
        setAudioLink(mode === "link" ? asString(item.mediaUrl) : "");
      } else {
        setAudioSourceMode("link");
        setAudioLink("");
      }

      setAudioFile(null);
      setCategory(itemCategory);
      setSubcategory(itemSubcategory);
      setIsPublished(item.isPublished !== false);
      setIsReady(true);
    }

    void initializePage();

    return () => {
      isActive = false;
    };
  }, [mediaId]);

  const categoryOptions = useMemo(() => {
    const names = getCategoryNames(categoryTree);
    if (category && !names.includes(category)) {
      return [...names, category];
    }
    return names;
  }, [category, categoryTree]);

  const subcategoryOptions = useMemo(() => {
    const names = getSubcategoryNames(categoryTree, category);
    if (subcategory && !names.includes(subcategory)) {
      return [...names, subcategory];
    }
    return names;
  }, [category, categoryTree, subcategory]);

  async function handleThumbnailFileSelection(file: File | null) {
    setThumbnailFile(file);

    if (!file) {
      setThumbnailPreviewUrl(existingThumbnailUrl);
      return;
    }

    try {
      const preview = await fileToDataUrl(file);
      setThumbnailPreviewUrl(preview);
    } catch {
      setThumbnailPreviewUrl(existingThumbnailUrl);
    }
  }

  function handleCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    const subcategories = getSubcategoryNames(categoryTree, nextCategory);
    setSubcategory(subcategories[0] || "");

    if (!isAudioCategory(nextCategory)) {
      setAudioSourceMode("link");
      setAudioLink("");
      setAudioFile(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!title.trim()) {
      setStatus("Title is required.");
      return;
    }

    if (!category.trim()) {
      setStatus("Please add at least one category first.");
      return;
    }

    const isAudio = isAudioCategory(category);
    const apiConfigured = hasApiBaseUrl();

    let resolvedMediaUrl = existingMediaUrl.trim();
    let resolvedMediaSourceType: "link" | "file" | "" = "";

    if (isAudio) {
      resolvedMediaSourceType = audioSourceMode;

      if (audioSourceMode === "link") {
        if (!asString(audioLink).trim()) {
          setStatus("Audio link is required.");
          return;
        }
        resolvedMediaUrl = asString(audioLink).trim();
      } else {
        if (!audioFile && !isEditing) {
          setStatus("Please choose an audio file.");
          return;
        }

        if (audioFile && !apiConfigured) {
          try {
            resolvedMediaUrl = await fileToDataUrl(audioFile);
          } catch {
            setStatus("Failed to read selected audio file.");
            return;
          }
        } else if (!audioFile && existingMediaUrl.trim()) {
          resolvedMediaUrl = existingMediaUrl.trim();
        } else if (!audioFile) {
          setStatus("Please choose an audio file.");
          return;
        }
      }
    }

    let fallbackThumbnail = existingThumbnailUrl.trim();
    if (thumbnailFile && !apiConfigured) {
      try {
        fallbackThumbnail = await fileToDataUrl(thumbnailFile);
      } catch {
        // keep existing URL fallback
      }
    }

    const localFallbackItem: MediaItem = {
      id: mediaId || createId("media"),
      title: title.trim(),
      description: description.trim(),
      speaker: speaker.trim(),
      mediaDate,
      thumbnailUrl: fallbackThumbnail,
      mediaUrl: resolvedMediaUrl,
      mediaSourceType: resolvedMediaSourceType,
      category,
      subcategory,
      isPublished,
      createdAt: new Date().toISOString(),
    };

    try {
      const remoteItem = await saveMediaItemApi(
        {
          title: localFallbackItem.title,
          description: localFallbackItem.description,
          category: localFallbackItem.category,
          subcategory: localFallbackItem.subcategory,
          speaker: localFallbackItem.speaker,
          mediaDate: localFallbackItem.mediaDate,
          mediaSourceType: localFallbackItem.mediaSourceType || "",
          mediaUrl: resolvedMediaUrl,
          thumbnailUrl: existingThumbnailUrl.trim(),
          thumbnailFile,
          audioFile,
          isPublished,
        },
        mediaId,
      );

      if (remoteItem) {
        const nextMediaItems = mediaId
          ? mediaItems.map((entry) => (entry.id === mediaId ? remoteItem : entry))
          : [remoteItem, ...mediaItems];
        setMediaItems(nextMediaItems);
        saveMediaItems(nextMediaItems);
      } else {
        if (apiConfigured) {
          setStatus("Unable to save media on the server.");
          return;
        }

        const nextMediaItems = mediaId
          ? mediaItems.map((entry) =>
              entry.id === mediaId ? { ...localFallbackItem, createdAt: entry.createdAt } : entry,
            )
          : [localFallbackItem, ...mediaItems];
        setMediaItems(nextMediaItems);
        saveMediaItems(nextMediaItems);
      }
    } catch (error) {
      if (apiConfigured) {
        setStatus(error instanceof Error ? error.message : "Audio upload failed. Please try again.");
        return;
      }

      const nextMediaItems = mediaId
        ? mediaItems.map((entry) =>
            entry.id === mediaId ? { ...localFallbackItem, createdAt: entry.createdAt } : entry,
          )
        : [localFallbackItem, ...mediaItems];
      setMediaItems(nextMediaItems);
      saveMediaItems(nextMediaItems);
      setStatus("Saved locally because API is not configured.");
      return;
    }

    const statusParam = mediaId ? "updated" : "created";
    router.push(`/admin/media-library?status=${statusParam}`);
  }

  if (!isReady) {
    return (
      <AdminShell title={isEditing ? "Edit Media" : "Add New Media"}>
        <section className={styles.panel}>
          <p className={styles.panelText}>Loading media form...</p>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={isEditing ? "Edit Media" : "Add New Media"}>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>{isEditing ? "Edit Media Item" : "Add New Media Item"}</h2>
        <p className={styles.panelText}>
          {isEditing
            ? "Update existing media details, thumbnail, and audio source settings."
            : "Create a new media item and assign category and subcategory."}
        </p>
      </section>

      <section className={styles.panel}>
        <form className={styles.formGrid} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="mediaTitle">Title</label>
            <input
              id="mediaTitle"
              value={title || ""}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter media title"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="mediaSpeaker">Speaker</label>
            <input
              id="mediaSpeaker"
              value={speaker || ""}
              onChange={(event) => setSpeaker(event.target.value)}
              placeholder="e.g. Pastor John"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="mediaCategory">Category</label>
            <select
              id="mediaCategory"
              value={category || ""}
              onChange={(event) => handleCategoryChange(event.target.value)}
            >
              {categoryOptions.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>
                  {categoryOption}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="mediaSubcategory">Subcategory</label>
            <select
              id="mediaSubcategory"
              value={subcategory || ""}
              onChange={(event) => setSubcategory(event.target.value)}
            >
              {subcategoryOptions.map((subOption) => (
                <option key={subOption} value={subOption}>
                  {subOption}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="mediaDate">Date</label>
            <input
              id="mediaDate"
              type="date"
              value={mediaDate || ""}
              onChange={(event) => setMediaDate(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="publishStatus">Publish</label>
            <select
              id="publishStatus"
              value={isPublished ? "published" : "draft"}
              onChange={(event) => setIsPublished(event.target.value === "published")}
            >
              <option value="published">Published</option>
              <option value="draft">Unpublished</option>
            </select>
          </div>

          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label htmlFor="mediaDescription">Description</label>
            <textarea
              id="mediaDescription"
              value={description || ""}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Write a short description"
            />
          </div>

          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label htmlFor="thumbFile">Thumbnail Image Upload</label>
            <div className={styles.uploadCard}>
              <div className={styles.uploadHeader}>
                <p className={styles.uploadTitle}>Upload thumbnail image</p>
                <p className={styles.uploadSubtext}>JPG, PNG, or WebP. Maximum file size: 5MB.</p>
              </div>

              <input
                id="thumbFile"
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  void handleThumbnailFileSelection(file);
                }}
              />

              <label htmlFor="thumbFile" className={styles.fileTrigger}>
                Choose Image
              </label>

              {thumbnailFile ? <p className={styles.fileName}>{thumbnailFile.name}</p> : null}

              {thumbnailPreviewUrl ? (
                <div className={styles.uploadPreviewWrap}>
                  <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className={styles.uploadPreview} />
                </div>
              ) : (
                <p className={styles.uploadSubtext}>No thumbnail selected yet.</p>
              )}
            </div>
          </div>

          {isAudioCategory(category) ? (
            <div key={`audio-source-${audioSourceMode}`} className={`${styles.field} ${styles.formGridFull}`}>
              <label>Audio Source</label>
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${audioSourceMode === "link" ? styles.toggleButtonActive : ""}`}
                  onClick={() => {
                    setAudioSourceMode("link");
                    setAudioFile(null);
                    setAudioLink(normalizedAudioLink);
                  }}
                >
                  Use Audio Link
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${audioSourceMode === "file" ? styles.toggleButtonActive : ""}`}
                  onClick={() => setAudioSourceMode("file")}
                >
                  Upload Audio File
                </button>
              </div>

              {audioSourceMode === "link" ? (
                <div key="audio-link-mode" className={styles.field}>
                  <label htmlFor="audioLink">Audio Link</label>
                  <input
                    id="audioLink"
                    value={normalizedAudioLink}
                    onChange={(event) => setAudioLink(event.target.value)}
                    placeholder="https://.../sermon.mp3"
                  />
                </div>
              ) : (
                <div key="audio-file-mode" className={styles.uploadCard}>
                  <div className={styles.uploadHeader}>
                    <p className={styles.uploadTitle}>Upload audio file</p>
                    <p className={styles.uploadSubtext}>MP3, WAV, M4A, AAC, OGG. Maximum file size: 50MB.</p>
                  </div>

                  <input
                    id="audioFile"
                    className={styles.hiddenFileInput}
                    type="file"
                    accept="audio/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setAudioFile(file);
                    }}
                  />
                  <label htmlFor="audioFile" className={styles.fileTrigger}>
                    Choose Audio File
                  </label>

                  {audioFile ? (
                    <p className={styles.fileName}>{audioFile.name}</p>
                  ) : existingMediaUrl ? (
                    <p className={styles.uploadSubtext}>Current audio file is already attached.</p>
                  ) : (
                    <p className={styles.uploadSubtext}>No audio file selected yet.</p>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <div className={`${styles.inlineActions} ${styles.formGridFull}`}>
            <button className={styles.buttonPrimary} type="submit">
              {isEditing ? "Update Media" : "Save Media"}
            </button>
            <button
              className={styles.buttonSecondary}
              type="button"
              onClick={() => router.push("/admin/media-library")}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      {status ? <p className={styles.status}>{status}</p> : null}
    </AdminShell>
  );
}
