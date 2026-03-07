"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "../admin-pages.module.css";
import AdminShell from "../components/admin-shell";
import {
  createId,
  DirectoryCellItem,
  DirectoryDistrictItem,
  DirectoryZoneItem,
  loadDistrictDirectory,
  saveDistrictDirectory,
} from "../lib/admin-store";
import {
  createDistrictZoneApi,
  createHomeCellApi,
  deleteDistrictZoneApi,
  deleteHomeCellApi,
  fetchDistrictDirectoryApi,
  updateDistrictZoneApi,
  updateHomeCellApi,
} from "../lib/admin-api";

type ZoneFormState = {
  name: string;
  sortOrder: string;
  zoneMinister: string;
};

type CellFormState = {
  name: string;
  sortOrder: string;
  address: string;
  minister: string;
  phone: string;
};

const EMPTY_ZONE_FORM: ZoneFormState = {
  name: "",
  sortOrder: "",
  zoneMinister: "",
};

const EMPTY_CELL_FORM: CellFormState = {
  name: "",
  sortOrder: "",
  address: "",
  minister: "",
  phone: "",
};

function sortDirectory(items: DirectoryDistrictItem[]): DirectoryDistrictItem[] {
  return [...items]
    .map((district) => ({
      ...district,
      zones: [...district.zones]
        .map((zone) => ({
          ...zone,
          cells: [...zone.cells].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
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

function zoneToForm(zone: DirectoryZoneItem): ZoneFormState {
  return {
    name: zone.name,
    sortOrder: String(zone.sortOrder || ""),
    zoneMinister: zone.zoneMinister,
  };
}

function cellToForm(cell: DirectoryCellItem): CellFormState {
  return {
    name: cell.name,
    sortOrder: String(cell.sortOrder || ""),
    address: cell.address,
    minister: cell.minister,
    phone: cell.phone,
  };
}

export default function AdminHomeCellsPage() {
  const [districts, setDistricts] = useState<DirectoryDistrictItem[]>(loadDistrictDirectory);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(() => loadDistrictDirectory()[0]?.id || "");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [status, setStatus] = useState("");

  const [zoneForm, setZoneForm] = useState<ZoneFormState>(EMPTY_ZONE_FORM);
  const [zoneEditingId, setZoneEditingId] = useState<string | null>(null);
  const [zoneFormOpen, setZoneFormOpen] = useState(false);

  const [cellForm, setCellForm] = useState<CellFormState>(EMPTY_CELL_FORM);
  const [cellEditingId, setCellEditingId] = useState<string | null>(null);
  const [cellFormOpen, setCellFormOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    const hasLocalFallback = loadDistrictDirectory().length > 0;

    async function hydrate() {
      try {
        const remoteItems = await fetchDistrictDirectoryApi();
        if (!isActive || !remoteItems) {
          if (!hasLocalFallback) {
            setStatus("Could not load home-cell data from the backend. Showing local fallback only.");
          }
          return;
        }

        const next = persistDirectory(remoteItems, setDistricts);
        setSelectedDistrictId((current) => current || next[0]?.id || "");
        setSelectedZoneId((current) => current || next[0]?.zones[0]?.id || "");
        setStatus(`Loaded ${next.length} districts for home-cell management.`);
      } catch {
        if (isActive && !hasLocalFallback) {
          setStatus("Could not load home-cell data from the backend. Showing local fallback only.");
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

  const selectedZone = useMemo(
    () => selectedDistrict?.zones.find((zone) => zone.id === selectedZoneId) || null,
    [selectedDistrict, selectedZoneId],
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

  function resetZoneForm() {
    setZoneEditingId(null);
    setZoneForm(EMPTY_ZONE_FORM);
  }

  function resetCellForm() {
    setCellEditingId(null);
    setCellForm(EMPTY_CELL_FORM);
  }

  function handleEditZone(zone: DirectoryZoneItem) {
    setZoneEditingId(zone.id);
    setZoneForm(zoneToForm(zone));
    setZoneFormOpen(true);
    setSelectedZoneId(zone.id);
    setStatus(`Editing zone '${zone.name}'.`);
  }

  async function handleDeleteZone(zone: DirectoryZoneItem) {
    if (!selectedDistrict) {
      return;
    }

    const confirmed = window.confirm(`Delete zone '${zone.name}' and all its home cells?`);
    if (!confirmed) {
      return;
    }

    const nextItems = districts.map((district) =>
      district.id === selectedDistrict.id
        ? {
            ...district,
            zones: district.zones.filter((item) => item.id !== zone.id),
          }
        : district,
    );
    persistDirectory(nextItems, setDistricts);

    if (selectedZoneId === zone.id) {
      setSelectedZoneId("");
    }

    try {
      await deleteDistrictZoneApi(zone.id);
    } catch {
      // keep local delete if API fails
    }

    setStatus(`Deleted zone '${zone.name}'.`);
  }

  async function handleSubmitZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDistrict) {
      setStatus("Select a district before managing zones.");
      return;
    }

    const name = zoneForm.name.trim();
    if (!name) {
      setStatus("Zone name is required.");
      return;
    }

    const sortOrder = Number(zoneForm.sortOrder || "0") || 0;
    const payload = {
      name,
      sortOrder,
      zoneMinister: zoneForm.zoneMinister.trim(),
    };

    const existingZone = selectedDistrict.zones.find((item) => item.id === zoneEditingId) || null;
    const fallbackZone: DirectoryZoneItem = {
      id: zoneEditingId || createId("zone"),
      name: payload.name,
      sortOrder: payload.sortOrder,
      zoneMinister: payload.zoneMinister,
      cells: existingZone?.cells || [],
    };

    try {
      const remoteZone = zoneEditingId
        ? await updateDistrictZoneApi(zoneEditingId, payload)
        : await createDistrictZoneApi(selectedDistrict.id, payload);
      const nextZone = remoteZone ? { ...remoteZone, cells: existingZone?.cells || [] } : fallbackZone;

      const nextItems = districts.map((district) =>
        district.id === selectedDistrict.id
          ? {
              ...district,
              zones: zoneEditingId
                ? district.zones.map((item) => (item.id === zoneEditingId ? nextZone : item))
                : [...district.zones, nextZone],
            }
          : district,
      );

      persistDirectory(nextItems, setDistricts);
      setSelectedZoneId(nextZone.id);
    } catch {
      const nextItems = districts.map((district) =>
        district.id === selectedDistrict.id
          ? {
              ...district,
              zones: zoneEditingId
                ? district.zones.map((item) => (item.id === zoneEditingId ? fallbackZone : item))
                : [...district.zones, fallbackZone],
            }
          : district,
      );

      persistDirectory(nextItems, setDistricts);
      setSelectedZoneId(fallbackZone.id);
    }

    setStatus(zoneEditingId ? "Zone updated successfully." : "Zone created successfully.");
    resetZoneForm();
    setZoneFormOpen(false);
  }

  function handleEditCell(cell: DirectoryCellItem) {
    setCellEditingId(cell.id);
    setCellForm(cellToForm(cell));
    setCellFormOpen(true);
    setStatus(`Editing home cell '${cell.name}'.`);
  }

  async function handleDeleteCell(cell: DirectoryCellItem) {
    if (!selectedDistrict || !selectedZone) {
      return;
    }

    const confirmed = window.confirm(`Delete home cell '${cell.name}'?`);
    if (!confirmed) {
      return;
    }

    const nextItems = districts.map((district) =>
      district.id === selectedDistrict.id
        ? {
            ...district,
            zones: district.zones.map((zone) =>
              zone.id === selectedZone.id
                ? {
                    ...zone,
                    cells: zone.cells.filter((item) => item.id !== cell.id),
                  }
                : zone,
            ),
          }
        : district,
    );
    persistDirectory(nextItems, setDistricts);

    try {
      await deleteHomeCellApi(cell.id);
    } catch {
      // keep local delete if API fails
    }

    setStatus(`Deleted home cell '${cell.name}'.`);
  }

  async function handleSubmitCell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDistrict || !selectedZone) {
      setStatus("Select a zone before managing home cells.");
      return;
    }

    const name = cellForm.name.trim();
    if (!name) {
      setStatus("Home cell name is required.");
      return;
    }

    const sortOrder = Number(cellForm.sortOrder || "0") || 0;
    const payload = {
      name,
      sortOrder,
      address: cellForm.address.trim(),
      minister: cellForm.minister.trim(),
      phone: cellForm.phone.trim(),
    };

    const fallbackCell: DirectoryCellItem = {
      id: cellEditingId || createId("cell"),
      name: payload.name,
      sortOrder: payload.sortOrder,
      address: payload.address,
      minister: payload.minister,
      phone: payload.phone,
    };

    try {
      const remoteCell = cellEditingId
        ? await updateHomeCellApi(cellEditingId, payload)
        : await createHomeCellApi(selectedZone.id, payload);
      const nextCell = remoteCell || fallbackCell;
      const nextItems = districts.map((district) =>
        district.id === selectedDistrict.id
          ? {
              ...district,
              zones: district.zones.map((zone) =>
                zone.id === selectedZone.id
                  ? {
                      ...zone,
                      cells: cellEditingId
                        ? zone.cells.map((item) => (item.id === cellEditingId ? nextCell : item))
                        : [...zone.cells, nextCell],
                    }
                  : zone,
              ),
            }
          : district,
      );
      persistDirectory(nextItems, setDistricts);
    } catch {
      const nextItems = districts.map((district) =>
        district.id === selectedDistrict.id
          ? {
              ...district,
              zones: district.zones.map((zone) =>
                zone.id === selectedZone.id
                  ? {
                      ...zone,
                      cells: cellEditingId
                        ? zone.cells.map((item) => (item.id === cellEditingId ? fallbackCell : item))
                        : [...zone.cells, fallbackCell],
                    }
                  : zone,
              ),
            }
          : district,
      );
      persistDirectory(nextItems, setDistricts);
    }

    setStatus(cellEditingId ? "Home cell updated successfully." : "Home cell created successfully.");
    resetCellForm();
    setCellFormOpen(false);
  }

  return (
    <AdminShell title="Home Cells">
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
        <h2 className={styles.panelTitle}>Home Cell Management</h2>
        <p className={styles.panelText}>
          Manage zones and individual home cells here. District details remain on the Districts page.
        </p>
        <div className={styles.inlineActions}>
          <Link href="/admin/districts" className={styles.linkButton}>
            Open Districts Page
          </Link>
        </div>
        {status ? <p className={styles.status}>{status}</p> : null}
      </section>

      {districts.length === 0 ? (
        <section className={styles.panel}>
          <p className={styles.emptyState}>No districts available yet. Create a district first before adding zones or home cells.</p>
        </section>
      ) : (
        <>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Select District</h2>
            <div className={styles.field}>
              <label htmlFor="districtSelector">District</label>
              <select
                id="districtSelector"
                value={selectedDistrictId}
                onChange={(event) => {
                  const nextDistrictId = event.target.value;
                  const nextDistrict = districts.find((district) => district.id === nextDistrictId) || null;
                  setSelectedDistrictId(nextDistrictId);
                  setSelectedZoneId(nextDistrict?.zones[0]?.id || "");
                }}
              >
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.sortOrder}. {district.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedDistrict ? (
              <>
                <div className={styles.chips}>
                  {selectedDistrict.homeCellPastors.map((pastor) => (
                    <span className={styles.chip} key={pastor}>
                      {pastor}
                    </span>
                  ))}
                </div>
                <p className={styles.panelText}>Home Cell Minister: {selectedDistrict.homeCellMinister || "—"}.</p>
              </>
            ) : null}
          </section>

          {selectedDistrict ? (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Zones in {selectedDistrict.name}</h2>
              <div className={styles.inlineActions}>
                <button
                  className={styles.buttonPrimary}
                  type="button"
                  onClick={() => {
                    if (zoneFormOpen && !zoneEditingId) {
                      setZoneFormOpen(false);
                      resetZoneForm();
                      return;
                    }

                    resetZoneForm();
                    setZoneFormOpen(true);
                  }}
                >
                  {zoneFormOpen && !zoneEditingId ? "Close Zone Form" : "Add Zone"}
                </button>
              </div>

              {zoneFormOpen ? (
                <form className={styles.formGrid} onSubmit={handleSubmitZone}>
                  <div className={styles.field}>
                    <label htmlFor="zoneName">Zone Name</label>
                    <input
                      id="zoneName"
                      value={zoneForm.name}
                      onChange={(event) => setZoneForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="zoneSortOrder">Display Order</label>
                    <input
                      id="zoneSortOrder"
                      type="number"
                      min="0"
                      value={zoneForm.sortOrder}
                      onChange={(event) => setZoneForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.formGridFull}`}>
                    <label htmlFor="zoneMinister">Zone Minister</label>
                    <input
                      id="zoneMinister"
                      value={zoneForm.zoneMinister}
                      onChange={(event) => setZoneForm((current) => ({ ...current, zoneMinister: event.target.value }))}
                    />
                  </div>
                  <div className={`${styles.inlineActions} ${styles.formGridFull}`}>
                    <button className={styles.buttonPrimary} type="submit">
                      {zoneEditingId ? "Update Zone" : "Save Zone"}
                    </button>
                    <button
                      className={styles.buttonSecondary}
                      type="button"
                      onClick={() => {
                        resetZoneForm();
                        setZoneFormOpen(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {selectedDistrict.zones.length === 0 ? (
                <p className={styles.emptyState}>No zones created for this district yet.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Zone</th>
                        <th>Zone Minister</th>
                        <th>Home Cells</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDistrict.zones.map((zone) => (
                        <tr key={zone.id} className={zone.id === selectedZoneId ? styles.activeTableRow : undefined}>
                          <td>{zone.sortOrder}</td>
                          <td>{zone.name}</td>
                          <td>{zone.zoneMinister || "—"}</td>
                          <td>{zone.cells.length}</td>
                          <td>
                            <div className={styles.listActions}>
                              <button
                                className={styles.buttonSecondary}
                                type="button"
                                onClick={() => setSelectedZoneId(zone.id)}
                              >
                                Cells
                              </button>
                              <button className={styles.buttonSecondary} type="button" onClick={() => handleEditZone(zone)}>
                                Edit
                              </button>
                              <button className={styles.buttonDanger} type="button" onClick={() => handleDeleteZone(zone)}>
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
          ) : null}

          {selectedDistrict && selectedZone ? (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Home Cells in {selectedZone.name}</h2>
              <p className={styles.panelText}>Zone Minister: {selectedZone.zoneMinister || "—"}.</p>
              <div className={styles.inlineActions}>
                <button
                  className={styles.buttonPrimary}
                  type="button"
                  onClick={() => {
                    if (cellFormOpen && !cellEditingId) {
                      setCellFormOpen(false);
                      resetCellForm();
                      return;
                    }

                    resetCellForm();
                    setCellFormOpen(true);
                  }}
                >
                  {cellFormOpen && !cellEditingId ? "Close Home Cell Form" : "Add Home Cell"}
                </button>
              </div>

              {cellFormOpen ? (
                <form className={styles.formGrid} onSubmit={handleSubmitCell}>
                  <div className={styles.field}>
                    <label htmlFor="cellName">Home Cell Name</label>
                    <input
                      id="cellName"
                      value={cellForm.name}
                      onChange={(event) => setCellForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="cellSortOrder">Display Order</label>
                    <input
                      id="cellSortOrder"
                      type="number"
                      min="0"
                      value={cellForm.sortOrder}
                      onChange={(event) => setCellForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.formGridFull}`}>
                    <label htmlFor="cellAddress">Address</label>
                    <textarea
                      id="cellAddress"
                      value={cellForm.address}
                      onChange={(event) => setCellForm((current) => ({ ...current, address: event.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="cellMinister">Cell Minister</label>
                    <input
                      id="cellMinister"
                      value={cellForm.minister}
                      onChange={(event) => setCellForm((current) => ({ ...current, minister: event.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="cellPhone">Phone</label>
                    <input
                      id="cellPhone"
                      value={cellForm.phone}
                      onChange={(event) => setCellForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </div>
                  <div className={`${styles.inlineActions} ${styles.formGridFull}`}>
                    <button className={styles.buttonPrimary} type="submit">
                      {cellEditingId ? "Update Home Cell" : "Save Home Cell"}
                    </button>
                    <button
                      className={styles.buttonSecondary}
                      type="button"
                      onClick={() => {
                        resetCellForm();
                        setCellFormOpen(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {selectedZone.cells.length === 0 ? (
                <p className={styles.emptyState}>No home cells in this zone yet.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Minister</th>
                        <th>Phone</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedZone.cells.map((cell) => (
                        <tr key={cell.id}>
                          <td>{cell.sortOrder}</td>
                          <td>{cell.name}</td>
                          <td>{cell.address || "—"}</td>
                          <td>{cell.minister || "—"}</td>
                          <td>{cell.phone || "—"}</td>
                          <td>
                            <div className={styles.listActions}>
                              <button className={styles.buttonSecondary} type="button" onClick={() => handleEditCell(cell)}>
                                Edit
                              </button>
                              <button className={styles.buttonDanger} type="button" onClick={() => handleDeleteCell(cell)}>
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
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
