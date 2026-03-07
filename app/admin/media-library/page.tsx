"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import AdminShell from "../components/admin-shell";
import styles from "../admin-pages.module.css";
import {
  MediaCategory,
  MediaItem,
  getCategoryNames,
  loadCategoryTree,
  loadMediaItems,
  saveCategoryTree,
  saveMediaItems,
} from "../lib/admin-store";
import {
  deleteMediaItemApi,
  fetchCategoriesApi,
  fetchMediaItemsApi,
  updateMediaPublishStatusApi,
} from "../lib/admin-api";

type SortMode = "newest" | "oldest" | "speaker" | "category";

type QueryStatus = "" | "created" | "updated" | "bulk-created";

function subscribeLocation(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getQueryStatusClientSnapshot(): QueryStatus {
  if (typeof window === "undefined") {
    return "";
  }

  const status = new URLSearchParams(window.location.search).get("status");
  if (status === "created" || status === "updated" || status === "bulk-created") {
    return status;
  }

  return "";
}

function getQueryStatusServerSnapshot(): QueryStatus {
  return "";
}

export default function AdminMediaLibraryPage() {
  const router = useRouter();

  const [mediaItems, setMediaItems] = useState(loadMediaItems);
  const [categoryTree, setCategoryTree] = useState(loadCategoryTree);
  const [actionStatus, setActionStatus] = useState("");
  const queryStatus = useSyncExternalStore(
    subscribeLocation,
    getQueryStatusClientSnapshot,
    getQueryStatusServerSnapshot,
  );

  const [filterCategory, setFilterCategory] = useState<"All" | MediaCategory>("All");
  const [filterSpeaker, setFilterSpeaker] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    let isActive = true;

    async function hydrateFromApi() {
      try {
        const [remoteMediaItems, remoteCategories] = await Promise.all([
          fetchMediaItemsApi(),
          fetchCategoriesApi(),
        ]);

        if (!isActive) {
          return;
        }

        if (remoteMediaItems) {
          setMediaItems(remoteMediaItems);
          saveMediaItems(remoteMediaItems);
        }

        if (remoteCategories && remoteCategories.length > 0) {
          setCategoryTree(remoteCategories);
          saveCategoryTree(remoteCategories);
        }
      } catch {
        // keep local fallback state
      }
    }

    void hydrateFromApi();

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

  const categoryFilters = useMemo(() => {
    const configured = getCategoryNames(categoryTree);
    const usedByMedia = mediaItems
      .map((item) => item.category)
      .filter(Boolean)
      .filter((value, index, source) => source.indexOf(value) === index);

    return [...new Set([...configured, ...usedByMedia])].sort((a, b) => a.localeCompare(b));
  }, [categoryTree, mediaItems]);

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

    setActionStatus(`Deleted '${item.title}'.`);
  }

  async function handlePublishToggle(item: MediaItem, nextPublished: boolean) {
    const previousItems = mediaItems;
    const optimisticItems = mediaItems.map((entry) =>
      entry.id === item.id
        ? {
            ...entry,
            isPublished: nextPublished,
          }
        : entry,
    );

    setMediaItems(optimisticItems);
    saveMediaItems(optimisticItems);

    try {
      const updated = await updateMediaPublishStatusApi(item.id, nextPublished);
      if (updated) {
        const nextItems = optimisticItems.map((entry) => (entry.id === updated.id ? updated : entry));
        setMediaItems(nextItems);
        saveMediaItems(nextItems);
      }
      setActionStatus(
        nextPublished ? `Published '${item.title}'.` : `Unpublished '${item.title}'.`,
      );
    } catch {
      setMediaItems(previousItems);
      saveMediaItems(previousItems);
      setActionStatus("Could not update publish status. Please try again.");
    }
  }

  const status =
    actionStatus ||
    (queryStatus === "created"
      ? "Media added successfully."
      : queryStatus === "updated"
        ? "Media updated successfully."
        : queryStatus === "bulk-created"
          ? "Bulk media added successfully."
        : "");

  return (
    <AdminShell title="Media Library">
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Media Manager</h2>
        <p className={styles.panelText}>
          Manage and categorize media files including sermon videos, audio, photos, and downloads.
        </p>

        <div className={styles.inlineActions}>
          <Link className={styles.buttonPrimary} href="/admin/media-library/new">
            Add New Media
          </Link>
          <Link className={styles.buttonSecondary} href="/admin/media-library/bulk">
            Bulk Add Media
          </Link>
          <Link className={styles.buttonSecondary} href="/admin/categories">
            Manage Categories
          </Link>
        </div>
      </section>

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
              {categoryFilters.map((entry) => (
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
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Post Image</th>
                  <th>Category</th>
                  <th>Sub-Category</th>
                  <th>Speaker</th>
                  <th>Play</th>
                  <th>Publish</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{item.category}</td>
                    <td>{item.subcategory || "-"}</td>
                    <td>{item.speaker || "-"}</td>
                    <td>
                      {item.mediaUrl ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <audio controls preload="none" src={item.mediaUrl} style={{ width: 170 }}>
                            Your browser does not support audio playback.
                          </audio>
                          {/* <a
                            className={styles.downloadLink}
                            href={item.mediaUrl}
                            download={item.title || true}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            &#x2913; Download
                          </a> */}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={item.isPublished !== false}
                          onChange={(event) => void handlePublishToggle(item, event.target.checked)}
                        />
                        <span>{item.isPublished !== false ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td>
                      <div className={styles.listActions}>
                        <button
                          className={styles.buttonSecondary}
                          type="button"
                          onClick={() => router.push(`/admin/media-library/edit/${item.id}`)}
                        >
                          Edit
                        </button>
                        <button className={styles.buttonDanger} type="button" onClick={() => void handleDelete(item)}>
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
