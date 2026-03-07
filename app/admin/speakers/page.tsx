"use client";

import { useEffect, useState } from "react";
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

function sortSpeakers(items: SpeakerItem[]): SpeakerItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function persistSpeakers(items: SpeakerItem[], setItems: (items: SpeakerItem[]) => void): SpeakerItem[] {
  const sorted = sortSpeakers(items);
  setItems(sorted);
  saveSpeakers(sorted);
  return sorted;
}

function renameSpeakerInMedia(oldName: string, newName: string): void {
  const nextMedia = loadMediaItems().map((item) =>
    item.speaker === oldName
      ? {
          ...item,
          speaker: newName,
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
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [status, setStatus] = useState("");

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

  async function handleAddSpeaker() {
    const name = newSpeakerName.trim();
    if (!name) {
      setStatus("Speaker name is required.");
      return;
    }

    const duplicateExists = speakers.some((item) => item.name.toLowerCase() === name.toLowerCase());
    if (duplicateExists) {
      setStatus("Speaker already exists.");
      return;
    }

    const fallbackSpeaker: SpeakerItem = {
      id: createId("speaker"),
      name,
    };

    try {
      const remoteSpeaker = await createSpeakerApi(name);
      persistSpeakers([...speakers, remoteSpeaker || fallbackSpeaker], setSpeakers);
      setStatus("Speaker added successfully.");
    } catch {
      persistSpeakers([...speakers, fallbackSpeaker], setSpeakers);
      setStatus("Speaker added locally.");
    }

    setNewSpeakerName("");
  }

  async function handleEditSpeaker(speaker: SpeakerItem) {
    const nextName = window.prompt("Edit speaker name", speaker.name)?.trim();
    if (!nextName) {
      return;
    }

    if (nextName === speaker.name) {
      setStatus("No changes made.");
      return;
    }

    const duplicateExists = speakers.some(
      (item) => item.id !== speaker.id && item.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (duplicateExists) {
      setStatus("Another speaker already uses that name.");
      return;
    }

    try {
      const remoteSpeaker = await updateSpeakerApi(speaker.id, nextName);
      const replacement = remoteSpeaker || { ...speaker, name: nextName };
      persistSpeakers(
        speakers.map((item) => (item.id === speaker.id ? replacement : item)),
        setSpeakers,
      );
      renameSpeakerInMedia(speaker.name, replacement.name);
      setStatus("Speaker updated successfully.");
    } catch {
      persistSpeakers(
        speakers.map((item) => (item.id === speaker.id ? { ...item, name: nextName } : item)),
        setSpeakers,
      );
      renameSpeakerInMedia(speaker.name, nextName);
      setStatus("Speaker updated locally.");
    }
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
        <h2 className={styles.panelTitle}>Add Speaker</h2>
        <p className={styles.panelText}>Create a controlled speaker list so names stay consistent across media items.</p>
        <div className={styles.inlineActions}>
          <input
            className={styles.inlineInput}
            value={newSpeakerName}
            onChange={(event) => setNewSpeakerName(event.target.value)}
            placeholder="Speaker name"
          />
          <button type="button" className={styles.buttonPrimary} onClick={() => void handleAddSpeaker()}>
            Add Speaker
          </button>
        </div>
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
                  <th>Speaker</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {speakers.map((speaker) => (
                  <tr key={speaker.id}>
                    <td>{speaker.name}</td>
                    <td>
                      <div className={styles.listActions}>
                        <button
                          type="button"
                          className={styles.buttonSecondary}
                          onClick={() => void handleEditSpeaker(speaker)}
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
