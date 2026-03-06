"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminShell from "../components/admin-shell";
import styles from "../admin-pages.module.css";
import { loadEvents, loadMediaItems } from "../lib/admin-store";

export default function AdminDashboardPage() {
  const [mediaItems] = useState(loadMediaItems);
  const [events] = useState(loadEvents);

  const stats = useMemo(() => {
    const videos = mediaItems.filter((item) => item.category === "Videos").length;
    const audios = mediaItems.filter((item) => item.category === "Audio").length;
    const photos = mediaItems.filter((item) => item.category === "Photos").length;
    const downloads = mediaItems.filter((item) => item.category === "Downloads").length;
    return {
      videos,
      audios,
      photos,
      downloads,
      events: events.length,
    };
  }, [events.length, mediaItems]);

  const recentUploads = useMemo(() => mediaItems.slice(0, 6), [mediaItems]);

  return (
    <AdminShell title="Dashboard">
      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Videos</p>
          <h3 className={styles.statValue}>{stats.videos}</h3>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Audio</p>
          <h3 className={styles.statValue}>{stats.audios}</h3>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Photos</p>
          <h3 className={styles.statValue}>{stats.photos}</h3>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Downloads</p>
          <h3 className={styles.statValue}>{stats.downloads}</h3>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Events</p>
          <h3 className={styles.statValue}>{stats.events}</h3>
        </article>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Quick Links</h2>
        <p className={styles.panelText}>Jump into common actions for daily admin work.</p>
        <div className={styles.inlineActions}>
          <Link className={styles.linkButton} href="/admin/media-library">
            Add New Media
          </Link>
          <Link className={styles.buttonSecondary} href="/admin/events">
            Manage Events
          </Link>
          <Link className={styles.buttonSecondary} href="/admin/blog/new">
            Create New Blog Post
          </Link>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Recent Uploads</h2>
        {recentUploads.length === 0 ? (
          <p className={styles.emptyState}>No media uploaded yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Speaker</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.category}</td>
                    <td>{item.speaker || "-"}</td>
                    <td>{item.mediaDate ? new Date(item.mediaDate).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
