"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./login.module.css";

const ADMIN_USERNAME = "admin@lfcjahi.com";
const ADMIN_PASSWORD = "12345678";
const AUTH_KEY = "lfcjahi_admin_auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isAuthenticated = window.localStorage.getItem(AUTH_KEY) === "true";
    if (isAuthenticated) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const isValid = username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD;

    if (!isValid) {
      setError("Invalid credentials. Please use the admin account details.");
      setIsSubmitting(false);
      return;
    }

    window.localStorage.setItem(AUTH_KEY, "true");
    window.localStorage.setItem("lfcjahi_admin_user", username.trim());
    router.push("/admin/dashboard");
  }

  return (
    <main className={styles.page}>
      <div className={styles.backgroundGlowTop} />
      <div className={styles.backgroundGlowBottom} />

      <section className={styles.card}>
        <div className={styles.brandRow}>
          <Image
            src="/lfc-assets/images/logo-1.png"
            alt="LFC Jahi"
            className={styles.logo}
            width={60}
            height={60}
          />
          <div>
            <p className={styles.brandKicker}>Admin Portal</p>
            <h1 className={styles.title}>LFC Jahi Dashboard</h1>
          </div>
        </div>

        <p className={styles.subtitle}>Sign in to manage message audio, testimonies, and ministry updates.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className={styles.input}
            type="email"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />

          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {error ? <p className={styles.error}>{error}</p> : null}

          <button className={styles.button} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
