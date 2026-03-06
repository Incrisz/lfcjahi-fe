"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "../components/admin-shell";
import styles from "../admin-pages.module.css";
import {
  MEDIA_CATEGORIES,
  MEDIA_SUBCATEGORIES,
  MediaCategory,
  MediaItem,
  createId,
  loadMediaItems,
  saveMediaItems,
} from "../lib/admin-store";
import {
  deleteMediaItemApi,
  fetchMediaItemsApi,
  hasApiBaseUrl,
  saveMediaItemApi,
} from "../lib/admin-api";

type SortMode = "newest" | "oldest" | "speaker" | "category";
type ViewMode = "grid" | "list";
type AudioSourceMode = "link" | "file";

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function AdminMediaLibraryPage() {
  const [mediaItems, setMediaItems] = useState(loadMediaItems);
  const [status, setStatus] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [mediaDate, setMediaDate] = useState("");
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState("");
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState("");
  const [audioSourceMode, setAudioSourceMode] = useState<AudioSourceMode>("link");
  const [audioLink, setAudioLink] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [category, setCategory] = useState<MediaCategory>("Videos");
  const [subcategory, setSubcategory] = useState(MEDIA_SUBCATEGORIES.Videos[0]);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterCategory, setFilterCategory] = useState<"All" | MediaCategory>("All");
  const [filterSpeaker, setFilterSpeaker] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    let isActive = true;

    async function hydrateFromApi() {
      try {
        const remoteItems = await fetchMediaItemsApi();
        if (isActive && remoteItems) {
          setMediaItems(remoteItems);
          saveMediaItems(remoteItems);
        }
      } catch {
        // keep local fallback state
      }
    }

    hydrateFromApi();

    return () => {
      isActive = false;
    };
  }, []);

  const speakers = useMemo(() => {
    const values = mediaItems
      .map((item) => item.speaker.trim())
      .filter(Boolean)
      .filter((value, index, source) => source.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b));
    return values;
  }, [mediaItems]);

  const filteredItems = useMemo(() => {
    const output = mediaItems.filter((item) => {
      const matchesCategory = filterCategory === "All" || item.category === filterCategory;
      const matchesSpeaker = filterSpeaker === "All" || item.speaker === filterSpeaker;
      return matchesCategory && matchesSpeaker;
    });

    output.sort((a, b) => {
      const dateA = new Date(a.mediaDate || a.createdAt).getTime();
      const dateB = new Date(b.mediaDate || b.createdAt).getTime();

      if (sortMode === "oldest") {
        return dateA - dateB;
      }

      if (sortMode === "speaker") {
        return a.speaker.localeCompare(b.speaker);
      }

      if (sortMode === "category") {
        return a.category.localeCompare(b.category);
      }

      return dateB - dateA;
    });

    return output;
  }, [filterCategory, filterSpeaker, mediaItems, sortMode]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSpeaker("");
    setMediaDate("");
    setExistingThumbnailUrl("");
    setThumbnailPreviewUrl("");
    setThumbnailFile(null);
    setExistingMediaUrl("");
    setAudioSourceMode("link");
    setAudioLink("");
    setAudioFile(null);
    setCategory("Videos");
    setSubcategory(MEDIA_SUBCATEGORIES.Videos[0]);
  }

  function handleCategoryChange(nextCategory: MediaCategory) {
    setCategory(nextCategory);
    setSubcategory(MEDIA_SUBCATEGORIES[nextCategory][0]);

    if (nextCategory !== "Audio") {
      setAudioSourceMode("link");
      setAudioLink("");
      setAudioFile(null);
    }
  }

  function handleEdit(item: MediaItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setSpeaker(item.speaker);
    setMediaDate(item.mediaDate);
    setExistingThumbnailUrl(item.thumbnailUrl);
    setThumbnailPreviewUrl(item.thumbnailUrl);
    setThumbnailFile(null);
    setExistingMediaUrl(item.mediaUrl);
    if (item.category === "Audio") {
      const mode = item.mediaSourceType === "file" ? "file" : "link";
      setAudioSourceMode(mode);
      setAudioLink(mode === "link" ? item.mediaUrl : "");
      setAudioFile(null);
    } else {
      setAudioSourceMode("link");
      setAudioLink("");
      setAudioFile(null);
    }
    setCategory(item.category);
    setSubcategory(item.subcategory || MEDIA_SUBCATEGORIES[item.category][0]);
    setIsFormOpen(true);
    setStatus(`Editing '${item.title}'`);
  }

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

  async function handleDelete(item: MediaItem) {
    const confirmed = window.confirm(`Delete '${item.title}'?`);
    if (!confirmed) {
      return;
    }

    const nextItems = mediaItems.filter((entry) => entry.id !== item.id);
    setMediaItems(nextItems);
    saveMediaItems(nextItems);

    try {
      await deleteMediaItemApi(item.id);
    } catch {
      // keep local delete even if API fails
    }

    setStatus(`Deleted '${item.title}'.`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setStatus("Title is required.");
      return;
    }

    let resolvedMediaUrl = existingMediaUrl.trim();

    if (category === "Audio") {
      if (audioSourceMode === "link") {
        if (!audioLink.trim()) {
          setStatus("Audio link is required when source type is link.");
          return;
        }
        resolvedMediaUrl = audioLink.trim();
      } else {
        if (!audioFile && !editingId) {
          setStatus("Please choose an audio file.");
          return;
        }
        if (!audioFile && editingId && existingMediaUrl) {
          resolvedMediaUrl = existingMediaUrl;
        } else if (!hasApiBaseUrl()) {
          setStatus("Audio file upload requires NEXT_PUBLIC_API_BASE_URL.");
          return;
        }
      }
    }

    let fallbackThumbnail = existingThumbnailUrl.trim();

    if (thumbnailFile && !hasApiBaseUrl()) {
      try {
        fallbackThumbnail = await fileToDataUrl(thumbnailFile);
      } catch {
        // keep existing URL fallback
      }
    }

    const localFallbackItem: MediaItem = {
      id: editingId || createId("media"),
      title: title.trim(),
      description: description.trim(),
      speaker: speaker.trim(),
      mediaDate,
      thumbnailUrl: fallbackThumbnail,
      mediaUrl: resolvedMediaUrl,
      mediaSourceType: category === "Audio" ? audioSourceMode : "",
      category,
      subcategory,
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
        },
        editingId || undefined,
      );

      if (remoteItem) {
        const nextItems = editingId
          ? mediaItems.map((entry) => (entry.id === editingId ? remoteItem : entry))
          : [remoteItem, ...mediaItems];

        setMediaItems(nextItems);
        saveMediaItems(nextItems);
        setStatus(editingId ? "Media updated successfully." : "Media added successfully.");
      } else {
        const nextItems = editingId
          ? mediaItems.map((entry) =>
              entry.id === editingId ? { ...localFallbackItem, createdAt: entry.createdAt } : entry,
            )
          : [localFallbackItem, ...mediaItems];

        setMediaItems(nextItems);
        saveMediaItems(nextItems);
        setStatus(
          thumbnailFile
            ? "Media saved locally. Configure NEXT_PUBLIC_API_BASE_URL to upload thumbnail files."
            : editingId
              ? "Media updated successfully."
              : "Media added successfully.",
        );
      }
    } catch {
      const nextItems = editingId
        ? mediaItems.map((entry) =>
            entry.id === editingId ? { ...localFallbackItem, createdAt: entry.createdAt } : entry,
          )
        : [localFallbackItem, ...mediaItems];

      setMediaItems(nextItems);
      saveMediaItems(nextItems);
      setStatus(
        thumbnailFile
          ? "Media saved locally. Configure NEXT_PUBLIC_API_BASE_URL to upload thumbnail files."
          : "Media saved locally.",
      );
    }

    resetForm();
    setIsFormOpen(false);
  }

  return (
    <AdminShell title="Media Library">
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Media Manager</h2>
        <p className={styles.panelText}>
          Manage and categorize media files including sermon videos, audio, photos, and downloads.
        </p>

        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={() => {
              setIsFormOpen((value) => !value);
              if (!isFormOpen) {
                resetForm();
              }
            }}
          >
            {isFormOpen ? "Close Form" : "Add New Media"}
          </button>

          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleButton} ${viewMode === "grid" ? styles.toggleButtonActive : ""}`}
              onClick={() => setViewMode("grid")}
            >
              Grid View
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${viewMode === "list" ? styles.toggleButtonActive : ""}`}
              onClick={() => setViewMode("list")}
            >
              List View
            </button>
          </div>
        </div>
      </section>

      {isFormOpen ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{editingId ? "Edit Media" : "Add New Media"}</h2>
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="mediaTitle">Title</label>
              <input
                id="mediaTitle"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter media title"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="mediaSpeaker">Speaker</label>
              <input
                id="mediaSpeaker"
                value={speaker}
                onChange={(event) => setSpeaker(event.target.value)}
                placeholder="e.g. Pastor John"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="mediaCategory">Category</label>
              <select
                id="mediaCategory"
                value={category}
                onChange={(event) => handleCategoryChange(event.target.value as MediaCategory)}
              >
                {MEDIA_CATEGORIES.map((categoryOption) => (
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
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
              >
                {MEDIA_SUBCATEGORIES[category].map((subOption) => (
                  <option key={subOption} value={subOption}>
                    {subOption}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="mediaDate">Date</label>
              <input id="mediaDate" type="date" value={mediaDate} onChange={(event) => setMediaDate(event.target.value)} />
            </div>

            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label htmlFor="mediaDescription">Description</label>
              <textarea
                id="mediaDescription"
                value={description}
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

            {category === "Audio" ? (
              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label>Audio Source</label>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${audioSourceMode === "link" ? styles.toggleButtonActive : ""}`}
                    onClick={() => {
                      setAudioSourceMode("link");
                      setAudioFile(null);
                    }}
                  >
                    Use Audio Link
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${audioSourceMode === "file" ? styles.toggleButtonActive : ""}`}
                    onClick={() => {
                      setAudioSourceMode("file");
                    }}
                  >
                    Upload Audio File
                  </button>
                </div>

                {audioSourceMode === "link" ? (
                  <div className={styles.field}>
                    <label htmlFor="audioLink">Audio Link</label>
                    <input
                      id="audioLink"
                      value={audioLink}
                      onChange={(event) => setAudioLink(event.target.value)}
                      placeholder="https://.../sermon.mp3"
                    />
                  </div>
                ) : (
                  <div className={styles.uploadCard}>
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
                {editingId ? "Update Media" : "Save Media"}
              </button>
              <button
                className={styles.buttonSecondary}
                type="button"
                onClick={() => {
                  resetForm();
                  setIsFormOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Sort and Filter</h2>
        <div className={styles.filtersGrid}>
          <div className={styles.field}>
            <label htmlFor="filterCategory">Category</label>
            <select
              id="filterCategory"
              value={filterCategory}
              onChange={(event) =>
                setFilterCategory(event.target.value === "All" ? "All" : (event.target.value as MediaCategory))
              }
            >
              <option value="All">All Categories</option>
              {MEDIA_CATEGORIES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="filterSpeaker">Speaker</label>
            <select
              id="filterSpeaker"
              value={filterSpeaker}
              onChange={(event) => setFilterSpeaker(event.target.value)}
            >
              <option value="All">All Speakers</option>
              {speakers.map((speakerName) => (
                <option key={speakerName} value={speakerName}>
                  {speakerName}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="sortMode">Sort</label>
            <select id="sortMode" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="speaker">Speaker</option>
              <option value="category">Category</option>
            </select>
          </div>

          <div className={styles.field}>
            <label>Total Media</label>
            <input value={String(filteredItems.length)} readOnly />
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Media Items</h2>
        {filteredItems.length === 0 ? (
          <p className={styles.emptyState}>No media matches your filters yet.</p>
        ) : viewMode === "grid" ? (
          <div className={styles.mediaGrid}>
            {filteredItems.map((item) => (
              <article key={item.id} className={styles.mediaCard}>
                <div className={styles.mediaThumb}>
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} />
                  ) : (
                    <span>{item.category.slice(0, 1)}</span>
                  )}
                </div>
                <div className={styles.mediaBody}>
                  <h3 className={styles.mediaTitle}>{item.title}</h3>
                  <div className={styles.metaRow}>
                    <span className={styles.tag}>{item.category}</span>
                    <span className={styles.tag}>{item.subcategory}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span>{item.speaker || "No speaker"}</span>
                    <span>{item.mediaDate ? new Date(item.mediaDate).toLocaleDateString() : "No date"}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.buttonSecondary} type="button" onClick={() => handleEdit(item)}>
                      Edit
                    </button>
                    <button className={styles.buttonDanger} type="button" onClick={() => handleDelete(item)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Speaker</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.category}</td>
                    <td>{item.speaker || "-"}</td>
                    <td>{item.mediaDate ? new Date(item.mediaDate).toLocaleDateString() : "-"}</td>
                    <td>
                      <div className={styles.listActions}>
                        <button className={styles.buttonSecondary} type="button" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
                        <button className={styles.buttonDanger} type="button" onClick={() => handleDelete(item)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {status ? <p className={styles.status}>{status}</p> : null}
    </AdminShell>
  );
}
