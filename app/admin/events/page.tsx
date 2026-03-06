"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "../components/admin-shell";
import styles from "../admin-pages.module.css";
import { EventItem, createId, loadEvents, saveEvents } from "../lib/admin-store";
import { deleteEventApi, fetchEventsApi, saveEventApi } from "../lib/admin-api";

export default function AdminEventsPage() {
  const [events, setEvents] = useState(loadEvents);
  const [status, setStatus] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function hydrateFromApi() {
      try {
        const remoteEvents = await fetchEventsApi();
        if (isActive && remoteEvents) {
          setEvents(remoteEvents);
          saveEvents(remoteEvents);
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

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter((item) => new Date(item.eventDate).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [events]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setEventDate("");
    setDescription("");
    setMediaUrl("");
    setRegistrationEnabled(false);
  }

  function handleEdit(item: EventItem) {
    setEditingId(item.id);
    setName(item.name);
    setEventDate(item.eventDate);
    setDescription(item.description);
    setMediaUrl(item.mediaUrl);
    setRegistrationEnabled(item.registrationEnabled);
    setIsFormOpen(true);
    setStatus(`Editing '${item.name}'.`);
  }

  async function handleDelete(item: EventItem) {
    const confirmed = window.confirm(`Delete event '${item.name}'?`);
    if (!confirmed) {
      return;
    }

    const nextEvents = events.filter((entry) => entry.id !== item.id);
    setEvents(nextEvents);
    saveEvents(nextEvents);

    try {
      await deleteEventApi(item.id);
    } catch {
      // keep local delete if API fails
    }

    setStatus(`Deleted event '${item.name}'.`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !eventDate) {
      setStatus("Event name and date are required.");
      return;
    }

    const localFallbackItem: EventItem = {
      id: editingId || createId("event"),
      name: name.trim(),
      eventDate,
      description: description.trim(),
      mediaUrl: mediaUrl.trim(),
      registrationEnabled,
      createdAt: new Date().toISOString(),
    };

    try {
      const remoteItem = await saveEventApi(
        {
          name: localFallbackItem.name,
          eventDate: localFallbackItem.eventDate,
          description: localFallbackItem.description,
          mediaUrl: localFallbackItem.mediaUrl,
          registrationEnabled: localFallbackItem.registrationEnabled,
        },
        editingId || undefined,
      );

      if (remoteItem) {
        const nextEvents = editingId
          ? events.map((entry) => (entry.id === editingId ? remoteItem : entry))
          : [...events, remoteItem];
        setEvents(nextEvents);
        saveEvents(nextEvents);
      } else {
        const nextEvents = editingId
          ? events.map((entry) =>
              entry.id === editingId ? { ...localFallbackItem, createdAt: entry.createdAt } : entry,
            )
          : [...events, localFallbackItem];
        setEvents(nextEvents);
        saveEvents(nextEvents);
      }
    } catch {
      const nextEvents = editingId
        ? events.map((entry) =>
            entry.id === editingId ? { ...localFallbackItem, createdAt: entry.createdAt } : entry,
          )
        : [...events, localFallbackItem];
      setEvents(nextEvents);
      saveEvents(nextEvents);
    }

    setStatus(editingId ? "Event updated successfully." : "Event created successfully.");
    resetForm();
    setIsFormOpen(false);
  }

  return (
    <AdminShell title="Events">
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Events Management</h2>
        <p className={styles.panelText}>
          Manage upcoming church services, conferences, and special celebrations.
        </p>

        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={() => {
              setIsFormOpen((value) => !value);
              if (isFormOpen) {
                resetForm();
              }
            }}
          >
            {isFormOpen ? "Close Event Form" : "Add New Event"}
          </button>
        </div>
      </section>

      {isFormOpen ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{editingId ? "Edit Event" : "Create New Event"}</h2>
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="eventName">Event Name</label>
              <input
                id="eventName"
                value={name}
                onChange={(entry) => setName(entry.target.value)}
                placeholder="Sunday Worship Service"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="eventDate">Date</label>
              <input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(entry) => setEventDate(entry.target.value)}
                required
              />
            </div>

            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label htmlFor="eventDescription">Description</label>
              <textarea
                id="eventDescription"
                value={description}
                onChange={(entry) => setDescription(entry.target.value)}
                placeholder="Describe the event"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="eventMedia">Related Media URL</label>
              <input
                id="eventMedia"
                value={mediaUrl}
                onChange={(entry) => setMediaUrl(entry.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="eventRegistration">Event Registration</label>
              <select
                id="eventRegistration"
                value={registrationEnabled ? "enabled" : "disabled"}
                onChange={(entry) => setRegistrationEnabled(entry.target.value === "enabled")}
              >
                <option value="disabled">Disabled</option>
                <option value="enabled">Enabled</option>
              </select>
            </div>

            <div className={`${styles.inlineActions} ${styles.formGridFull}`}>
              <button className={styles.buttonPrimary} type="submit">
                {editingId ? "Update Event" : "Save Event"}
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
        <h2 className={styles.panelTitle}>Upcoming Events</h2>
        {upcomingEvents.length === 0 ? (
          <p className={styles.emptyState}>No upcoming events yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date</th>
                  <th>Registration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{new Date(item.eventDate).toLocaleDateString()}</td>
                    <td>{item.registrationEnabled ? "Enabled" : "Disabled"}</td>
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
