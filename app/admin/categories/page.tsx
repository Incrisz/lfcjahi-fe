"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../admin-pages.module.css";
import AdminShell from "../components/admin-shell";
import {
  CategoryItem,
  CategorySubcategory,
  createId,
  loadCategoryTree,
  loadMediaItems,
  saveCategoryTree,
  saveMediaItems,
} from "../lib/admin-store";
import {
  createCategoryApi,
  createSubcategoryApi,
  deleteCategoryApi,
  deleteSubcategoryApi,
  fetchCategoriesApi,
  updateCategoryApi,
  updateSubcategoryApi,
} from "../lib/admin-api";

function sortCategoryTree(items: CategoryItem[]): CategoryItem[] {
  return [...items]
    .map((category) => ({
      ...category,
      subcategories: [...category.subcategories].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function persistCategoryTree(items: CategoryItem[], setItems: (items: CategoryItem[]) => void): CategoryItem[] {
  const sorted = sortCategoryTree(items);
  setItems(sorted);
  saveCategoryTree(sorted);
  return sorted;
}

function renameCategoryInMedia(oldName: string, newName: string): void {
  const media = loadMediaItems().map((item) =>
    item.category === oldName
      ? {
          ...item,
          category: newName,
        }
      : item,
  );
  saveMediaItems(media);
}

function deleteCategoryInMedia(categoryName: string): void {
  const media = loadMediaItems().map((item) =>
    item.category === categoryName
      ? {
          ...item,
          category: "Uncategorized",
          subcategory: "",
        }
      : item,
  );
  saveMediaItems(media);
}

function renameSubcategoryInMedia(categoryName: string, oldName: string, newName: string): void {
  const media = loadMediaItems().map((item) =>
    item.category === categoryName && item.subcategory === oldName
      ? {
          ...item,
          subcategory: newName,
        }
      : item,
  );
  saveMediaItems(media);
}

function deleteSubcategoryInMedia(categoryName: string, subcategoryName: string): void {
  const media = loadMediaItems().map((item) =>
    item.category === categoryName && item.subcategory === subcategoryName
      ? {
          ...item,
          subcategory: "",
        }
      : item,
  );
  saveMediaItems(media);
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>(() => sortCategoryTree(loadCategoryTree()));
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    () => sortCategoryTree(loadCategoryTree())[0]?.id || "",
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isActive = true;

    async function hydrateCategories() {
      try {
        const remoteCategories = await fetchCategoriesApi();
        if (!isActive || !remoteCategories || remoteCategories.length === 0) {
          return;
        }

        const next = persistCategoryTree(remoteCategories, setCategories);
        if (next.length > 0) {
          setSelectedCategoryId(next[0].id);
        }
      } catch {
        // keep local fallback state
      }
    }

    void hydrateCategories();

    return () => {
      isActive = false;
    };
  }, []);

  const totalSubcategories = useMemo(
    () => categories.reduce((total, category) => total + category.subcategories.length, 0),
    [categories],
  );

  const selectedCategory = useMemo(
    () => categories.find((entry) => entry.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setStatus("Category name is required.");
      return;
    }

    const duplicateExists = categories.some((item) => item.name.toLowerCase() === name.toLowerCase());
    if (duplicateExists) {
      setStatus("Category already exists.");
      return;
    }

    const fallbackCategory: CategoryItem = {
      id: createId("category"),
      name,
      subcategories: [],
    };

    try {
      const remoteCategory = await createCategoryApi(name);
      const addedCategory = remoteCategory || fallbackCategory;
      const nextCategories = persistCategoryTree([...categories, addedCategory], setCategories);
      setSelectedCategoryId(addedCategory.id || nextCategories[0]?.id || "");
      setStatus("Category added successfully.");
    } catch {
      const nextCategories = persistCategoryTree([...categories, fallbackCategory], setCategories);
      setSelectedCategoryId(fallbackCategory.id || nextCategories[0]?.id || "");
      setStatus("Category added locally.");
    }

    setNewCategoryName("");
  }

  async function handleEditCategory(category: CategoryItem) {
    const nextName = window.prompt("Edit category name", category.name)?.trim();
    if (!nextName) {
      return;
    }

    if (nextName === category.name) {
      setStatus("No changes made.");
      return;
    }

    const duplicateExists = categories.some(
      (item) => item.id !== category.id && item.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (duplicateExists) {
      setStatus("Another category already uses that name.");
      return;
    }

    try {
      const remoteCategory = await updateCategoryApi(category.id, nextName);
      const replacement = remoteCategory || { ...category, name: nextName };
      const nextCategories = categories.map((item) => (item.id === category.id ? replacement : item));
      persistCategoryTree(nextCategories, setCategories);
      renameCategoryInMedia(category.name, replacement.name);
      setStatus("Category updated successfully.");
    } catch {
      const nextCategories = categories.map((item) =>
        item.id === category.id
          ? {
              ...item,
              name: nextName,
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      renameCategoryInMedia(category.name, nextName);
      setStatus("Category updated locally.");
    }
  }

  async function handleDeleteCategory(category: CategoryItem) {
    const confirmed = window.confirm(`Delete category '${category.name}' and all subcategories?`);
    if (!confirmed) {
      return;
    }

    const nextCategories = persistCategoryTree(
      categories.filter((item) => item.id !== category.id),
      setCategories,
    );
    deleteCategoryInMedia(category.name);

    if (selectedCategoryId === category.id) {
      setSelectedCategoryId(nextCategories[0]?.id || "");
    }

    try {
      await deleteCategoryApi(category.id);
      setStatus("Category deleted successfully.");
    } catch {
      setStatus("Category deleted locally.");
    }
  }

  async function handleAddSubcategory() {
    if (!selectedCategory) {
      setStatus("Please select a category first.");
      return;
    }

    const name = newSubcategoryName.trim();
    if (!name) {
      setStatus("Subcategory name is required.");
      return;
    }

    const duplicateExists = selectedCategory.subcategories.some(
      (entry) => entry.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicateExists) {
      setStatus("Subcategory already exists for this category.");
      return;
    }

    const fallbackSubcategory: CategorySubcategory = {
      id: createId("subcategory"),
      name,
    };

    try {
      const remoteSubcategory = await createSubcategoryApi(selectedCategory.id, name);
      const subcategory = remoteSubcategory || fallbackSubcategory;
      const nextCategories = categories.map((item) =>
        item.id === selectedCategory.id
          ? {
              ...item,
              subcategories: [...item.subcategories, subcategory],
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      setStatus("Subcategory added successfully.");
    } catch {
      const nextCategories = categories.map((item) =>
        item.id === selectedCategory.id
          ? {
              ...item,
              subcategories: [...item.subcategories, fallbackSubcategory],
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      setStatus("Subcategory added locally.");
    }

    setNewSubcategoryName("");
  }

  async function handleEditSubcategory(subcategory: CategorySubcategory) {
    if (!selectedCategory) {
      return;
    }

    const nextName = window.prompt("Edit subcategory name", subcategory.name)?.trim();
    if (!nextName) {
      return;
    }

    if (nextName === subcategory.name) {
      setStatus("No changes made.");
      return;
    }

    const duplicateExists = selectedCategory.subcategories.some(
      (entry) => entry.id !== subcategory.id && entry.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (duplicateExists) {
      setStatus("Another subcategory already uses that name in this category.");
      return;
    }

    try {
      const remoteSubcategory = await updateSubcategoryApi(subcategory.id, nextName);
      const replacement = remoteSubcategory || { ...subcategory, name: nextName };
      const nextCategories = categories.map((item) =>
        item.id === selectedCategory.id
          ? {
              ...item,
              subcategories: item.subcategories.map((entry) => (entry.id === subcategory.id ? replacement : entry)),
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      renameSubcategoryInMedia(selectedCategory.name, subcategory.name, replacement.name);
      setStatus("Subcategory updated successfully.");
    } catch {
      const nextCategories = categories.map((item) =>
        item.id === selectedCategory.id
          ? {
              ...item,
              subcategories: item.subcategories.map((entry) =>
                entry.id === subcategory.id
                  ? {
                      ...entry,
                      name: nextName,
                    }
                  : entry,
              ),
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      renameSubcategoryInMedia(selectedCategory.name, subcategory.name, nextName);
      setStatus("Subcategory updated locally.");
    }
  }

  async function handleDeleteSubcategory(subcategory: CategorySubcategory) {
    if (!selectedCategory) {
      return;
    }

    const confirmed = window.confirm(
      `Delete subcategory '${subcategory.name}' from '${selectedCategory.name}'?`,
    );
    if (!confirmed) {
      return;
    }

    const nextCategories = categories.map((item) =>
      item.id === selectedCategory.id
        ? {
            ...item,
            subcategories: item.subcategories.filter((entry) => entry.id !== subcategory.id),
          }
        : item,
    );
    persistCategoryTree(nextCategories, setCategories);
    deleteSubcategoryInMedia(selectedCategory.name, subcategory.name);

    try {
      await deleteSubcategoryApi(subcategory.id);
      setStatus("Subcategory deleted successfully.");
    } catch {
      setStatus("Subcategory deleted locally.");
    }
  }

  return (
    <AdminShell title="Categories">
      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Categories</p>
          <h3 className={styles.statValue}>{categories.length}</h3>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Subcategories</p>
          <h3 className={styles.statValue}>{totalSubcategories}</h3>
        </article>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Add Category</h2>
        <p className={styles.panelText}>Create a top-level category for your content.</p>
        <div className={styles.inlineActions}>
          <input
            className={styles.inlineInput}
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Category name"
          />
          <button type="button" className={styles.buttonPrimary} onClick={() => void handleAddCategory()}>
            Add Category
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Categories</h2>
        {categories.length === 0 ? (
          <p className={styles.emptyState}>No categories yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Subcategories</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className={selectedCategoryId === category.id ? styles.activeTableRow : ""}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <td>{category.name}</td>
                    <td>{category.subcategories.length}</td>
                    <td>
                      <div className={styles.listActions}>
                        <button
                          type="button"
                          className={styles.buttonSecondary}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleEditCategory(category);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.buttonDanger}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteCategory(category);
                          }}
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

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Subcategory Manager</h2>
        {!selectedCategory ? (
          <p className={styles.emptyState}>Select a category to manage subcategories.</p>
        ) : (
          <>
            <div className={styles.inlineActions}>
              <select
                className={styles.inlineInput}
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                className={styles.inlineInput}
                value={newSubcategoryName}
                onChange={(event) => setNewSubcategoryName(event.target.value)}
                placeholder={`Add subcategory to ${selectedCategory.name}`}
              />
              <button type="button" className={styles.buttonPrimary} onClick={() => void handleAddSubcategory()}>
                Add Subcategory
              </button>
            </div>

            {selectedCategory.subcategories.length === 0 ? (
              <p className={styles.emptyState}>No subcategories in this category yet.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Subcategory</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCategory.subcategories.map((subcategory) => (
                      <tr key={subcategory.id}>
                        <td>{subcategory.name}</td>
                        <td>
                          <div className={styles.listActions}>
                            <button
                              type="button"
                              className={styles.buttonSecondary}
                              onClick={() => void handleEditSubcategory(subcategory)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={styles.buttonDanger}
                              onClick={() => void handleDeleteSubcategory(subcategory)}
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
          </>
        )}
      </section>

      {status ? <p className={styles.status}>{status}</p> : null}
    </AdminShell>
  );
}
