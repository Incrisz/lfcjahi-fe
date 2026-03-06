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
  const [categories, setCategories] = useState<CategoryItem[]>(loadCategoryTree);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryNames, setNewSubcategoryNames] = useState<Record<string, string>>({});
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isActive = true;

    async function hydrateCategories() {
      try {
        const remoteCategories = await fetchCategoriesApi();
        if (!isActive || !remoteCategories || remoteCategories.length === 0) {
          return;
        }

        persistCategoryTree(remoteCategories, setCategories);
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

  function findCategoryById(categoryId: string): CategoryItem | undefined {
    return categories.find((entry) => entry.id === categoryId);
  }

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
      const nextCategories = [...categories, remoteCategory || fallbackCategory];
      persistCategoryTree(nextCategories, setCategories);
      setStatus("Category added successfully.");
    } catch {
      const nextCategories = [...categories, fallbackCategory];
      persistCategoryTree(nextCategories, setCategories);
      setStatus("Category added locally.");
    }

    setNewCategoryName("");
  }

  async function handleUpdateCategory(category: CategoryItem) {
    const draftName = (categoryDrafts[category.id] ?? category.name).trim();
    if (!draftName) {
      setStatus("Category name is required.");
      return;
    }

    if (draftName === category.name) {
      setStatus("No changes to save.");
      return;
    }

    const duplicateExists = categories.some(
      (item) => item.id !== category.id && item.name.toLowerCase() === draftName.toLowerCase(),
    );
    if (duplicateExists) {
      setStatus("Another category already uses that name.");
      return;
    }

    try {
      const remoteCategory = await updateCategoryApi(category.id, draftName);
      const replacement = remoteCategory || { ...category, name: draftName };
      const nextCategories = categories.map((item) => (item.id === category.id ? replacement : item));
      persistCategoryTree(nextCategories, setCategories);
      renameCategoryInMedia(category.name, replacement.name);
      setStatus("Category updated successfully.");
    } catch {
      const nextCategories = categories.map((item) =>
        item.id === category.id
          ? {
              ...item,
              name: draftName,
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      renameCategoryInMedia(category.name, draftName);
      setStatus("Category updated locally.");
    }

    setCategoryDrafts((previous) => ({
      ...previous,
      [category.id]: "",
    }));
  }

  async function handleDeleteCategory(category: CategoryItem) {
    const confirmed = window.confirm(`Delete category '${category.name}' and all subcategories?`);
    if (!confirmed) {
      return;
    }

    const nextCategories = categories.filter((item) => item.id !== category.id);
    persistCategoryTree(nextCategories, setCategories);
    deleteCategoryInMedia(category.name);

    try {
      await deleteCategoryApi(category.id);
      setStatus("Category deleted successfully.");
    } catch {
      setStatus("Category deleted locally.");
    }
  }

  async function handleAddSubcategory(categoryId: string) {
    const category = findCategoryById(categoryId);
    if (!category) {
      setStatus("Category not found.");
      return;
    }

    const name = (newSubcategoryNames[categoryId] || "").trim();
    if (!name) {
      setStatus("Subcategory name is required.");
      return;
    }

    const duplicateExists = category.subcategories.some((entry) => entry.name.toLowerCase() === name.toLowerCase());
    if (duplicateExists) {
      setStatus("Subcategory already exists for this category.");
      return;
    }

    const fallbackSubcategory: CategorySubcategory = {
      id: createId("subcategory"),
      name,
    };

    try {
      const remoteSubcategory = await createSubcategoryApi(categoryId, name);
      const subcategory = remoteSubcategory || fallbackSubcategory;
      const nextCategories = categories.map((item) =>
        item.id === categoryId
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
        item.id === categoryId
          ? {
              ...item,
              subcategories: [...item.subcategories, fallbackSubcategory],
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      setStatus("Subcategory added locally.");
    }

    setNewSubcategoryNames((previous) => ({
      ...previous,
      [categoryId]: "",
    }));
  }

  async function handleUpdateSubcategory(category: CategoryItem, subcategory: CategorySubcategory) {
    const draftName = (subcategoryDrafts[subcategory.id] ?? subcategory.name).trim();
    if (!draftName) {
      setStatus("Subcategory name is required.");
      return;
    }

    if (draftName === subcategory.name) {
      setStatus("No changes to save.");
      return;
    }

    const duplicateExists = category.subcategories.some(
      (entry) => entry.id !== subcategory.id && entry.name.toLowerCase() === draftName.toLowerCase(),
    );
    if (duplicateExists) {
      setStatus("Another subcategory already uses that name in this category.");
      return;
    }

    try {
      const remoteSubcategory = await updateSubcategoryApi(subcategory.id, draftName);
      const replacement = remoteSubcategory || { ...subcategory, name: draftName };
      const nextCategories = categories.map((item) =>
        item.id === category.id
          ? {
              ...item,
              subcategories: item.subcategories.map((entry) => (entry.id === subcategory.id ? replacement : entry)),
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      renameSubcategoryInMedia(category.name, subcategory.name, replacement.name);
      setStatus("Subcategory updated successfully.");
    } catch {
      const nextCategories = categories.map((item) =>
        item.id === category.id
          ? {
              ...item,
              subcategories: item.subcategories.map((entry) =>
                entry.id === subcategory.id
                  ? {
                      ...entry,
                      name: draftName,
                    }
                  : entry,
              ),
            }
          : item,
      );
      persistCategoryTree(nextCategories, setCategories);
      renameSubcategoryInMedia(category.name, subcategory.name, draftName);
      setStatus("Subcategory updated locally.");
    }

    setSubcategoryDrafts((previous) => ({
      ...previous,
      [subcategory.id]: "",
    }));
  }

  async function handleDeleteSubcategory(category: CategoryItem, subcategory: CategorySubcategory) {
    const confirmed = window.confirm(
      `Delete subcategory '${subcategory.name}' from '${category.name}'?`,
    );
    if (!confirmed) {
      return;
    }

    const nextCategories = categories.map((item) =>
      item.id === category.id
        ? {
            ...item,
            subcategories: item.subcategories.filter((entry) => entry.id !== subcategory.id),
          }
        : item,
    );
    persistCategoryTree(nextCategories, setCategories);
    deleteSubcategoryInMedia(category.name, subcategory.name);

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
        <p className={styles.panelText}>Create a new content category for media organization.</p>
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
        <h2 className={styles.panelTitle}>Category Manager</h2>
        {categories.length === 0 ? (
          <p className={styles.emptyState}>No categories yet.</p>
        ) : (
          <div className={styles.categoryList}>
            {categories.map((category) => (
              <article key={category.id} className={styles.categoryCard}>
                <div className={styles.categoryHeader}>
                  <input
                    className={styles.inlineInput}
                    value={categoryDrafts[category.id] ?? category.name}
                    onChange={(event) =>
                      setCategoryDrafts((previous) => ({
                        ...previous,
                        [category.id]: event.target.value,
                      }))
                    }
                    aria-label={`Category name for ${category.name}`}
                  />
                  <div className={styles.listActions}>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => void handleUpdateCategory(category)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className={styles.buttonDanger}
                      onClick={() => void handleDeleteCategory(category)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className={styles.inlineActions}>
                  <input
                    className={styles.inlineInput}
                    value={newSubcategoryNames[category.id] || ""}
                    onChange={(event) =>
                      setNewSubcategoryNames((previous) => ({
                        ...previous,
                        [category.id]: event.target.value,
                      }))
                    }
                    placeholder={`Add subcategory to ${category.name}`}
                  />
                  <button
                    type="button"
                    className={styles.buttonPrimary}
                    onClick={() => void handleAddSubcategory(category.id)}
                  >
                    Add Subcategory
                  </button>
                </div>

                {category.subcategories.length === 0 ? (
                  <p className={styles.emptyState}>No subcategories in this category.</p>
                ) : (
                  <div className={styles.subcategoryList}>
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className={styles.subcategoryRow}>
                        <input
                          className={styles.inlineInput}
                          value={subcategoryDrafts[subcategory.id] ?? subcategory.name}
                          onChange={(event) =>
                            setSubcategoryDrafts((previous) => ({
                              ...previous,
                              [subcategory.id]: event.target.value,
                            }))
                          }
                          aria-label={`Subcategory name for ${subcategory.name}`}
                        />
                        <div className={styles.listActions}>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() => void handleUpdateSubcategory(category, subcategory)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.buttonDanger}
                            onClick={() => void handleDeleteSubcategory(category, subcategory)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {status ? <p className={styles.status}>{status}</p> : null}
    </AdminShell>
  );
}
