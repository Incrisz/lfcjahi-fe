"use client";

import { FormEvent, useState } from "react";
import AdminShell from "../../components/admin-shell";
import styles from "../../admin-pages.module.css";

type BlogDraft = {
  title: string;
  excerpt: string;
  content: string;
  publishDate: string;
};

const BLOG_DRAFT_KEY = "lfcjahi_admin_blog_drafts";

export default function AdminBlogNewPage() {
  const [draft, setDraft] = useState<BlogDraft>({
    title: "",
    excerpt: "",
    content: "",
    publishDate: "",
  });
  const [status, setStatus] = useState("");

  function updateDraft<Key extends keyof BlogDraft>(key: Key, value: BlogDraft[Key]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setStatus("Blog title is required.");
      return;
    }

    if (typeof window !== "undefined") {
      const existing = window.localStorage.getItem(BLOG_DRAFT_KEY);
      const current = existing ? (JSON.parse(existing) as BlogDraft[]) : [];
      const next = [{ ...draft }, ...current];
      window.localStorage.setItem(BLOG_DRAFT_KEY, JSON.stringify(next));
    }

    setStatus("Blog draft saved locally.");
    setDraft({
      title: "",
      excerpt: "",
      content: "",
      publishDate: "",
    });
  }

  return (
    <AdminShell title="Create Blog Post">
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>New Blog Post</h2>
        <p className={styles.panelText}>Create and save blog drafts while backend endpoints are being finalized.</p>

        <form className={styles.formGrid} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="blogTitle">Title</label>
            <input
              id="blogTitle"
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="Enter blog title"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="blogDate">Publish Date</label>
            <input
              id="blogDate"
              type="date"
              value={draft.publishDate}
              onChange={(event) => updateDraft("publishDate", event.target.value)}
            />
          </div>

          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label htmlFor="blogExcerpt">Excerpt</label>
            <textarea
              id="blogExcerpt"
              value={draft.excerpt}
              onChange={(event) => updateDraft("excerpt", event.target.value)}
            />
          </div>

          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label htmlFor="blogContent">Content</label>
            <textarea
              id="blogContent"
              value={draft.content}
              onChange={(event) => updateDraft("content", event.target.value)}
              placeholder="Write the full article"
            />
          </div>

          <div className={`${styles.inlineActions} ${styles.formGridFull}`}>
            <button className={styles.buttonPrimary} type="submit">
              Save Draft
            </button>
          </div>
        </form>

        {status ? <p className={styles.status}>{status}</p> : null}
      </section>
    </AdminShell>
  );
}
