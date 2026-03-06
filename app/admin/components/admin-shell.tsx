"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { AUTH_KEY, USER_KEY } from "../lib/admin-store";
import styles from "./admin-shell.module.css";

type AdminShellProps = {
  title: string;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/media-library", label: "Media Library" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/theme-settings", label: "Theme Settings" },
];

export default function AdminShell({ title, children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isReady] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(AUTH_KEY) === "true";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName] = useState(() => {
    if (typeof window === "undefined") {
      return "admin@lfcjahi.com";
    }

    return window.localStorage.getItem(USER_KEY) || "admin@lfcjahi.com";
  });

  useEffect(() => {
    if (!isReady) {
      router.replace("/admin/login");
    }
  }, [isReady, router]);

  function handleLogout() {
    window.localStorage.removeItem(AUTH_KEY);
    window.localStorage.removeItem(USER_KEY);
    router.push("/admin/login");
  }

  if (!isReady) {
    return (
      <main className={styles.loadingPage}>
        <p>Loading admin...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <div>
            <p className={styles.kicker}>LFC Jahi</p>
            <h2 className={styles.sidebarTitle}>Admin Dashboard</h2>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button className={styles.logoutDesktop} onClick={handleLogout} type="button">
          Logout
        </button>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <section className={styles.contentArea}>
        <header className={styles.topbar}>
          <button
            className={styles.menuButton}
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>

          <div>
            <p className={styles.welcome}>Welcome, {adminName}</p>
            <h1 className={styles.pageTitle}>{title}</h1>
          </div>

          <button className={styles.logoutMobile} onClick={handleLogout} type="button">
            Logout
          </button>
        </header>

        {children}
      </section>
    </main>
  );
}
