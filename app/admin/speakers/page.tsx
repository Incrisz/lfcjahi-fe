"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "../admin-pages.module.css";
import AdminShell from "../components/admin-shell";
import {
  SpeakerItem,
  createId,
  loadMediaItems,
  loadSpeakers,
  saveMediaItems,
  saveSpeakers,
} from "../lib/admin-store";
import {
  createSpeakerApi,
  deleteSpeakerApi,
  fetchSpeakersApi,
  hasApiBaseUrl,
  updateSpeakerApi,
} from "../lib/admin-api";

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function sortSpeakers(items: SpeakerItem[]): SpeakerItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function persistSpeakers(items: SpeakerItem[], setItems: (items: SpeakerItem[]) => void): SpeakerItem[] {
  const sorted = sortSpeakers(items);
  setItems(sorted);
  saveSpeakers(sorted);
  return sorted;
}

function renameSpeakerInMedia(oldName: string, replacement: SpeakerItem): void {
  const nextMedia = loadMediaItems().map((item) =>
    item.speaker === oldName
      ? {
          ...item,
          speaker: replacement.name,
          speakerImageUrl: replacement.imageUrl,
          thumbnailUrl: item.customThumbnailUrl || replacement.imageUrl,
        }
      : item,
  );

  saveMediaItems(nextMedia);
}

function deleteSpeakerInMedia(name: string): void {
  const nextMedia = loadMediaItems().map((item) =>
    item.speaker === name
      ? {
          ...item,
          speaker: "",
          speakerImageUrl: "",
          thumbnailUrl: item.customThumbnailUrl || "",
        }
      : item,
  );

  saveMediaItems(nextMedia);
}

function syncSpeakerImageInMedia(name: string, imageUrl: string): void {
  const nextMedia = loadMediaItems().map((item) =>
    item.speaker === name
      ? {
          ...item,
          speakerImageUrl: imageUrl,
          thumbnailUrl: item.customThumbnailUrl || imageUrl,
        }
      : item,
  );

  saveMediaItems(nextMedia);
}

function countSpeakerContent(name: string): number {
  return loadMediaItems().filter((item) => item.speaker === name).length;
}

export default function AdminSpeakersPage() {
  const [speakers, setSpeakers] = useState<SpeakerItem[]>(() => sortSpeakers(loadSpeakers()));
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [speakerName, setSpeakerName] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function hydrateSpeakers() {
      try {
        const remoteSpeakers = await fetchSpeakersApi();
        if (!isActive || !remoteSpeakers) {
          return;
        }

        persistSpeakers(remoteSpeakers, setSpeakers);
      } catch {
        // keep local fallback state
      }
    }

    void hydrateSpeakers();

    return () => {
      isActive = false;
    };
  }, []);

  const activeImageUrl = imagePreviewUrl || (removeImage ? "" : existingImageUrl);
  const editingSpeaker = editingSpeakerId ? speakers.find((item) => item.id === editingSpeakerId) || null : null;

  function resetForm() {
    setEditingSpeakerId(null);
    setSpeakerName("");
    setExistingImageUrl("");
    setImagePreviewUrl("");
    setImageFile(null);
    setRemoveImage(false);
  }

  async function handleImageSelection(file: File | null) {
    setImageFile(file);
    setRemoveImage(false);

    if (!file) {
      setImagePreviewUrl("");
      return;
    }

    try {
      const preview = await fileToDataUrl(file);
      setImagePreviewUrl(preview);
    } catch {
      setImagePreviewUrl("");
      setStatus("Could not preview the selected image.");
    }
  }

  function handleEditSpeaker(speaker: SpeakerItem) {
    setEditingSpeakerId(speaker.id);
    setSpeakerName(speaker.name);
    setExistingImageUrl(speaker.imageUrl || "");
    setImagePreviewUrl("");
    setImageFile(null);
    setRemoveImage(false);
    setStatus("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const name = speakerName.trim();
    if (!name) {
      setStatus("Speaker name is required.");
      return;
    }

    const duplicateExists = speakers.some(
      (item) => item.id !== editingSpeakerId && item.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicateExists) {
      setStatus("Another speaker already uses that name.");
      return;
    }

    setIsSaving(true);

    let localImageUrl = removeImage ? "" : existingImageUrl;
    if (imageFile && !hasApiBaseUrl()) {
      try {
        localImageUrl = await fileToDataUrl(imageFile);
      } catch {
        setStatus("Could not read the selected image.");
        setIsSaving(false);
        return;
      }
    } else if (imageFile) {
      localImageUrl = existingImageUrl;
    }

    const fallbackSpeaker: SpeakerItem = {
      id: editingSpeakerId || createId("speaker"),
      name,
      imageUrl: localImageUrl,
    };

    try {
      const remoteSpeaker = editingSpeakerId
        ? await updateSpeakerApi(editingSpeakerId, {
            name,
            imageFile,
            removeImage,
          })
        : await createSpeakerApi({
            name,
            imageFile,
          });
      const replacement = remoteSpeaker || fallbackSpeaker;

      if (editingSpeaker) {
        persistSpeakers(
          speakers.map((item) => (item.id === editingSpeaker.id ? replacement : item)),
          setSpeakers,
        );

        if (editingSpeaker.name !== replacement.name) {
          renameSpeakerInMedia(editingSpeaker.name, replacement);
        } else {
          syncSpeakerImageInMedia(replacement.name, replacement.imageUrl);
        }
      } else {
        persistSpeakers([...speakers, replacement], setSpeakers);
      }

      setStatus(editingSpeakerId ? "Speaker updated successfully." : "Speaker added successfully.");
      resetForm();
    } catch (error) {
      if (hasApiBaseUrl()) {
        setStatus(error instanceof Error ? error.message : "Could not save speaker.");
        setIsSaving(false);
        return;
      }

      if (editingSpeaker) {
        const replacement = fallbackSpeaker;
        persistSpeakers(
          speakers.map((item) => (item.id === editingSpeaker.id ? replacement : item)),
          setSpeakers,
        );

        if (editingSpeaker.name !== replacement.name) {
          renameSpeakerInMedia(editingSpeaker.name, replacement);
        } else {
          syncSpeakerImageInMedia(replacement.name, replacement.imageUrl);
        }
      } else {
        persistSpeakers([...speakers, fallbackSpeaker], setSpeakers);
      }

      setStatus(editingSpeakerId ? "Speaker updated locally." : "Speaker added locally.");
      resetForm();
    }

    setIsSaving(false);
  }

  async function handleDeleteSpeaker(speaker: SpeakerItem) {
    const confirmed = window.confirm(`Delete speaker '${speaker.name}'?`);
    if (!confirmed) {
      return;
    }

    const attachedContentCount = countSpeakerContent(speaker.name);
    if (attachedContentCount > 0) {
      setStatus(
        `Cannot delete '${speaker.name}' because it still has ${attachedContentCount} media item(s). Remove the content first.`,
      );
      return;
    }

    const apiConfigured = hasApiBaseUrl();

    try {
      if (apiConfigured) {
        await deleteSpeakerApi(speaker.id);
      }

      persistSpeakers(
        speakers.filter((item) => item.id !== speaker.id),
        setSpeakers,
      );
      deleteSpeakerInMedia(speaker.name);
      if (editingSpeakerId === speaker.id) {
        resetForm();
      }
      setStatus(apiConfigured ? "Speaker deleted successfully." : "Speaker deleted locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete speaker.");
    }
  }

  return (
    <AdminShell title="Speakers">
      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Speakers</p>
          <h3 className={styles.statValue}>{speakers.length}</h3>
        </article>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>{editingSpeakerId ? "Edit Speaker" : "Add Speaker"}</h2>
        <p className={styles.panelText}>
          Add a speaker photo here. Media items without their own thumbnail will automatically use that speaker image.
        </p>

        <form className={styles.formGrid} onSubmit={(event) => void handleSubmit(event)}>
          <div className={styles.field}>
            <label htmlFor="speakerName">Speaker Name</label>
            <input
              id="speakerName"
              value={speakerName}
              onChange={(event) => setSpeakerName(event.target.value)}
              placeholder="Pastor or speaker name"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="speakerImage">Speaker Photo</label>
            <div className={styles.uploadCard}>
              <div className={styles.uploadHeader}>
                <p className={styles.uploadTitle}>Upload speaker image</p>
                <p className={styles.uploadSubtext}>JPG, PNG, or WebP. Maximum file size: 5MB.</p>
              </div>

              <input
                id="speakerImage"
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  void handleImageSelection(file);
                }}
              />

              <div className={styles.inlineActions}>
                <label htmlFor="speakerImage" className={styles.fileTrigger}>
                  Choose Image
                </label>
                {(existingImageUrl || imageFile) ? (
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={() => {
                      setImageFile(null);
                      setImagePreviewUrl("");
                      setExistingImageUrl("");
                      setRemoveImage(true);
                    }}
                  >
                    Clear Image
                  </button>
                ) : null}
              </div>

              {imageFile ? <p className={styles.fileName}>{imageFile.name}</p> : null}

              {activeImageUrl ? (
                <div className={styles.uploadPreviewWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeImageUrl} alt="Speaker preview" className={styles.uploadPreview} />
                </div>
              ) : (
                <p className={styles.uploadSubtext}>No speaker photo selected yet.</p>
              )}
            </div>
          </div>

          <div className={`${styles.inlineActions} ${styles.formGridFull}`}>
            <button className={styles.buttonPrimary} type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : editingSpeakerId ? "Update Speaker" : "Add Speaker"}
            </button>
            {editingSpeakerId ? (
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => {
                  resetForm();
                  setStatus("Edit cancelled.");
                }}
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Speaker Directory</h2>
        {speakers.length === 0 ? (
          <p className={styles.emptyState}>No speakers yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Speaker</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {speakers.map((speaker) => (
                  <tr key={speaker.id}>
                    <td>
                      {speaker.imageUrl ? (
                        <div className={styles.uploadPreviewWrap} style={{ maxWidth: 80 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={speaker.imageUrl} alt={speaker.name} className={styles.uploadPreview} />
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{speaker.name}</td>
                    <td>
                      <div className={styles.listActions}>
                        <button
                          type="button"
                          className={styles.buttonSecondary}
                          onClick={() => handleEditSpeaker(speaker)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.buttonDanger}
                          onClick={() => void handleDeleteSpeaker(speaker)}
                        >
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
