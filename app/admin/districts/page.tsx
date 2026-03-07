"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "../admin-pages.module.css";
import AdminShell from "../components/admin-shell";
import { createId, DirectoryDistrictItem, loadDistrictDirectory, saveDistrictDirectory } from "../lib/admin-store";
import { deleteDistrictApi, fetchDistrictDirectoryApi, saveDistrictApi } from "../lib/admin-api";

type DistrictFormState = {
  name: string;
  sortOrder: string;
  coverageAreas: string;
  homeCellPastors: string;
  homeCellMinister: string;
  outreachPastor: string;
  outreachMinister: string;
  outreachLocation: string;
};

const EMPTY_DISTRICT_FORM: DistrictFormState = {
  name: "",
  sortOrder: "",
  coverageAreas: "",
  homeCellPastors: "",
  homeCellMinister: "",
  outreachPastor: "",
  outreachMinister: "",
  outreachLocation: "",
};

function sortDirectory(items: DirectoryDistrictItem[]): DirectoryDistrictItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function persistDirectory(
  items: DirectoryDistrictItem[],
  setItems: (items: DirectoryDistrictItem[]) => void,
): DirectoryDistrictItem[] {
  const next = sortDirectory(items);
  setItems(next);
  saveDistrictDirectory(next);
  return next;
}

function districtToForm(district: DirectoryDistrictItem): DistrictFormState {
  return {
    name: district.name,
    sortOrder: String(district.sortOrder || ""),
    coverageAreas: district.coverageAreas,
    homeCellPastors: district.homeCellPastors.join("\n"),
    homeCellMinister: district.homeCellMinister,
    outreachPastor: district.outreachPastor,
    outreachMinister: district.outreachMinister,
    outreachLocation: district.outreachLocation,
  };
}

function parsePastors(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminDistrictsPage() {
  const [districts, setDistricts] = useState<DirectoryDistrictItem[]>(loadDistrictDirectory);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(() => loadDistrictDirectory()[0]?.id || "");
  const [status, setStatus] = useState("");

  const [districtForm, setDistrictForm] = useState<DistrictFormState>(EMPTY_DISTRICT_FORM);
  const [districtEditingId, setDistrictEditingId] = useState<string | null>(null);
  const [districtFormOpen, setDistrictFormOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    const hasLocalFallback = loadDistrictDirectory().length > 0;

    async function hydrate() {
      try {
        const remoteItems = await fetchDistrictDirectoryApi();
        if (!isActive || !remoteItems) {
          if (!hasLocalFallback) {
            setStatus("Could not load districts from the backend. Showing local fallback only.");
          }
          return;
        }

        const next = persistDirectory(remoteItems, setDistricts);
        setSelectedDistrictId((current) => current || next[0]?.id || "");
        setStatus(`Loaded ${next.length} district records from the backend.`);
      } catch {
        if (isActive && !hasLocalFallback) {
          setStatus("Could not load districts from the backend. Showing local fallback only.");
        }
      }
    }

    void hydrate();

    return () => {
      isActive = false;
    };
  }, []);

  const selectedDistrict = useMemo(
    () => districts.find((district) => district.id === selectedDistrictId) || null,
    [districts, selectedDistrictId],
  );

  const totalZones = useMemo(
    () => districts.reduce((total, district) => total + district.zones.length, 0),
    [districts],
  );

  const totalCells = useMemo(
    () =>
      districts.reduce(
        (total, district) => total + district.zones.reduce((zoneTotal, zone) => zoneTotal + zone.cells.length, 0),
        0,
      ),
    [districts],
  );

  function resetDistrictForm() {
    setDistrictEditingId(null);
    setDistrictForm(EMPTY_DISTRICT_FORM);
  }

  function handleEditDistrict(district: DirectoryDistrictItem) {
    setDistrictEditingId(district.id);
    setDistrictForm(districtToForm(district));
    setDistrictFormOpen(true);
    setSelectedDistrictId(district.id);
    setStatus(`Editing district '${district.name}'.`);
  }

  async function handleDeleteDistrict(district: DirectoryDistrictItem) {
    const confirmed = window.confirm(`Delete district '${district.name}' and all its zones/cells?`);
    if (!confirmed) {
      return;
    }

    const nextItems = districts.filter((item) => item.id !== district.id);
    const persisted = persistDirectory(nextItems, setDistricts);

    if (selectedDistrictId === district.id) {
      setSelectedDistrictId(persisted[0]?.id || "");
    }

    try {
      await deleteDistrictApi(district.id);
    } catch {
      // keep local delete if API fails
    }

    setStatus(`Deleted district '${district.name}'.`);
  }

  async function handleSubmitDistrict(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = districtForm.name.trim();
    if (!name) {
      setStatus("District name is required.");
      return;
    }

    const sortOrder = Number(districtForm.sortOrder || "0") || 0;
    const payload = {
      name,
      sortOrder,
      coverageAreas: districtForm.coverageAreas.trim(),
      homeCellPastors: parsePastors(districtForm.homeCellPastors),
      homeCellMinister: districtForm.homeCellMinister.trim(),
      outreachPastor: districtForm.outreachPastor.trim(),
      outreachMinister: districtForm.outreachMinister.trim(),
      outreachLocation: districtForm.outreachLocation.trim(),
    };

    const existingDistrict = districts.find((item) => item.id === districtEditingId) || null;
    const fallbackDistrict: DirectoryDistrictItem = {
      id: districtEditingId || createId("district"),
      name: payload.name,
      sortOrder: payload.sortOrder,
      coverageAreas: payload.coverageAreas,
      homeCellPastors: payload.homeCellPastors,
      homeCellMinister: payload.homeCellMinister,
      outreachPastor: payload.outreachPastor,
      outreachMinister: payload.outreachMinister,
      outreachLocation: payload.outreachLocation,
      zones: existingDistrict?.zones || [],
    };

    try {
      const remoteDistrict = await saveDistrictApi(payload, districtEditingId || undefined);
      const nextDistrict = remoteDistrict || fallbackDistrict;
      const nextItems = districtEditingId
        ? districts.map((item) =>
            item.id === districtEditingId ? { ...nextDistrict, zones: nextDistrict.zones || item.zones } : item,
          )
        : [...districts, nextDistrict];
      persistDirectory(nextItems, setDistricts);
      setSelectedDistrictId(nextDistrict.id);
    } catch {
      const nextItems = districtEditingId
        ? districts.map((item) => (item.id === districtEditingId ? fallbackDistrict : item))
        : [...districts, fallbackDistrict];
      persistDirectory(nextItems, setDistricts);
      setSelectedDistrictId(fallbackDistrict.id);
    }

    setStatus(districtEditingId ? "District updated successfully." : "District created successfully.");
    resetDistrictForm();
    setDistrictFormOpen(false);
  }

  return (
    <AdminShell title="Districts">
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Districts</p>
          <p className={styles.statValue}>{districts.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Zones</p>
          <p className={styles.statValue}>{totalZones}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Home Cells</p>
          <p className={styles.statValue}>{totalCells}</p>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>District Management</h2>
        <p className={styles.panelText}>
          Manage district records and outreach details here. Home-cell zones and cell records now live on the separate
          Home Cells page.
        </p>
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={() => {
              if (districtFormOpen && !districtEditingId) {
                setDistrictFormOpen(false);
                resetDistrictForm();
                return;
              }

              resetDistrictForm();
              setDistrictFormOpen(true);
            }}
          >
            {districtFormOpen && !districtEditingId ? "Close District Form" : "Add District"}
          </button>
          <Link href="/admin/home-cells" className={styles.linkButton}>
            Open Home Cells Page
          </Link>
        </div>
        {status ? <p className={styles.status}>{status}</p> : null}
      </section>

      {districtFormOpen ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{districtEditingId ? "Edit District" : "Create District"}</h2>
          <form className={styles.formGrid} onSubmit={handleSubmitDistrict}>
            <div className={styles.field}>
              <label htmlFor="districtName">District Name</label>
              <input
                id="districtName"
                value={districtForm.name}
                onChange={(event) => setDistrictForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="districtSortOrder">Display Order</label>
              <input
                id="districtSortOrder"
                type="number"
                min="0"
                value={districtForm.sortOrder}
                onChange={(event) => setDistrictForm((current) => ({ ...current, sortOrder: event.target.value }))}
              />
            </div>

            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label htmlFor="districtCoverageAreas">Coverage Areas</label>
              <textarea
                id="districtCoverageAreas"
                value={districtForm.coverageAreas}
                onChange={(event) => setDistrictForm((current) => ({ ...current, coverageAreas: event.target.value }))}
              />
            </div>

            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label htmlFor="districtPastors">Home Cell Pastors (one per line)</label>
              <textarea
                id="districtPastors"
                value={districtForm.homeCellPastors}
                onChange={(event) => setDistrictForm((current) => ({ ...current, homeCellPastors: event.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="districtMinister">Home Cell Minister</label>
              <input
                id="districtMinister"
                value={districtForm.homeCellMinister}
                onChange={(event) => setDistrictForm((current) => ({ ...current, homeCellMinister: event.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="outreachPastor">Outreach Pastor</label>
              <input
                id="outreachPastor"
                value={districtForm.outreachPastor}
                onChange={(event) => setDistrictForm((current) => ({ ...current, outreachPastor: event.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="outreachMinister">Outreach Minister</label>
              <input
                id="outreachMinister"
                value={districtForm.outreachMinister}
                onChange={(event) => setDistrictForm((current) => ({ ...current, outreachMinister: event.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="outreachLocation">Outreach Location</label>
              <input
                id="outreachLocation"
                value={districtForm.outreachLocation}
                onChange={(event) => setDistrictForm((current) => ({ ...current, outreachLocation: event.target.value }))}
              />
            </div>

            <div className={`${styles.inlineActions} ${styles.formGridFull}`}>
              <button className={styles.buttonPrimary} type="submit">
                {districtEditingId ? "Update District" : "Save District"}
              </button>
              <button
                className={styles.buttonSecondary}
                type="button"
                onClick={() => {
                  resetDistrictForm();
                  setDistrictFormOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Districts</h2>
        {districts.length === 0 ? (
          <p className={styles.emptyState}>No districts available yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>District</th>
                  <th>Coverage</th>
                  <th>Outreach Location</th>
                  <th>Zones</th>
                  <th>Home Cells</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((district) => {
                  const cellCount = district.zones.reduce((total, zone) => total + zone.cells.length, 0);

                  return (
                    <tr
                      key={district.id}
                      className={district.id === selectedDistrictId ? styles.activeTableRow : undefined}
                    >
                      <td>{district.sortOrder}</td>
                      <td>{district.name}</td>
                      <td>{district.coverageAreas || "—"}</td>
                      <td>{district.outreachLocation || "—"}</td>
                      <td>{district.zones.length}</td>
                      <td>{cellCount}</td>
                      <td>
                        <div className={styles.listActions}>
                          <button
                            className={styles.buttonSecondary}
                            type="button"
                            onClick={() => setSelectedDistrictId(district.id)}
                          >
                            View
                          </button>
                          <Link href="/admin/home-cells" className={styles.linkButton}>
                            Home Cells
                          </Link>
                          <button className={styles.buttonSecondary} type="button" onClick={() => handleEditDistrict(district)}>
                            Edit
                          </button>
                          <button className={styles.buttonDanger} type="button" onClick={() => handleDeleteDistrict(district)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedDistrict ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{selectedDistrict.name} Summary</h2>
          <p className={styles.panelText}>Coverage Areas: {selectedDistrict.coverageAreas || "—"}</p>
          <div className={styles.chips}>
            {selectedDistrict.homeCellPastors.map((pastor) => (
              <span className={styles.chip} key={pastor}>
                {pastor}
              </span>
            ))}
          </div>
          <p className={styles.panelText}>Home Cell Minister: {selectedDistrict.homeCellMinister || "—"}</p>
          <p className={styles.panelText}>Outreach Pastor: {selectedDistrict.outreachPastor || "—"}</p>
          <p className={styles.panelText}>Outreach Minister: {selectedDistrict.outreachMinister || "—"}</p>
          <p className={styles.panelText}>Outreach Location: {selectedDistrict.outreachLocation || "—"}</p>
        </section>
      ) : null}
    </AdminShell>
  );
}
