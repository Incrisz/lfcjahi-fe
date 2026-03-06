"use client";

import { FormEvent, useState } from "react";
import AdminShell from "../components/admin-shell";
import styles from "../admin-pages.module.css";
import { ThemeSettings, loadThemeSettings, saveThemeSettings } from "../lib/admin-store";

export default function AdminThemeSettingsPage() {
  const [settings, setSettings] = useState<ThemeSettings>(loadThemeSettings);
  const [status, setStatus] = useState("");

  function updateField<Key extends keyof ThemeSettings>(key: Key, value: ThemeSettings[Key]) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    saveThemeSettings(settings);

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (baseUrl) {
      try {
        await fetch(`${baseUrl}/api/admin/theme-settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
      } catch {
        // keep local save if API fails
      }
    }

    setStatus("Theme settings saved successfully.");
  }

  return (
    <AdminShell title="Theme Settings">
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>General Settings</h2>
        <p className={styles.panelText}>Customize church identity details displayed across the website.</p>

        <form className={styles.formGrid} onSubmit={handleSave}>
          <div className={styles.field}>
            <label htmlFor="churchName">Church Name</label>
            <input
              id="churchName"
              value={settings.churchName}
              onChange={(event) => updateField("churchName", event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="tagline">Tagline</label>
            <input
              id="tagline"
              value={settings.tagline}
              onChange={(event) => updateField("tagline", event.target.value)}
            />
          </div>

          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label htmlFor="logoUrl">Logo URL</label>
            <input
              id="logoUrl"
              value={settings.logoUrl}
              onChange={(event) => updateField("logoUrl", event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="primaryColor">Primary Color</label>
            <input
              id="primaryColor"
              type="color"
              value={settings.primaryColor}
              onChange={(event) => updateField("primaryColor", event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="accentColor">Accent Color</label>
            <input
              id="accentColor"
              type="color"
              value={settings.accentColor}
              onChange={(event) => updateField("accentColor", event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="fontFamily">Font</label>
            <select
              id="fontFamily"
              value={settings.fontFamily}
              onChange={(event) => updateField("fontFamily", event.target.value)}
            >
              <option value="system-ui, -apple-system, Segoe UI, Roboto, sans-serif">System Sans</option>
              <option value="Georgia, 'Times New Roman', serif">Classic Serif</option>
              <option value="'Trebuchet MS', Tahoma, sans-serif">Modern Sans</option>
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="layoutStyle">Layout Style</label>
            <select
              id="layoutStyle"
              value={settings.layoutStyle}
              onChange={(event) => updateField("layoutStyle", event.target.value as ThemeSettings["layoutStyle"])}
            >
              <option value="standard">Standard</option>
              <option value="wide">Wide</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          <div className={`${styles.inlineActions} ${styles.formGridFull}`}>
            <button className={styles.buttonPrimary} type="submit">
              Save Settings
            </button>
          </div>
        </form>

        {status ? <p className={styles.status}>{status}</p> : null}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Live Preview</h2>
        <p className={styles.panelText}>Preview updates immediately before publishing.</p>
        <div
          className={styles.previewCard}
          style={{
            background: `linear-gradient(140deg, ${settings.primaryColor} 0%, ${settings.accentColor} 120%)`,
            fontFamily: settings.fontFamily,
          }}
        >
          <h3 className={styles.previewTitle}>{settings.churchName}</h3>
          <p className={styles.previewTagline}>{settings.tagline}</p>
          <p className={styles.previewLayout}>Layout: {settings.layoutStyle}</p>
        </div>
      </section>
    </AdminShell>
  );
}
