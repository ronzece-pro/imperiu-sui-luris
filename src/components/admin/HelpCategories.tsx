"use client";

import React, { useEffect, useState, useCallback } from "react";

interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  _count?: { posts: number };
}

export default function HelpCategoriesAdmin() {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<HelpCategory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/help/categories?includeInactive=true&withCount=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleToggleActive = async (category: HelpCategory) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/help/categories", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: category.id,
          isActive: !category.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error toggling category:", error);
    }
  };

  const handleDelete = async (category: HelpCategory) => {
    if (!confirm(`Sigur vrei să ștergi categoria "${category.name}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/help/categories?id=${category.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Se încarcă...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Categorii Ajutor ({categories.length})</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg"
        >
          + Adaugă Categorie
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Ordine</th>
              <th className="px-4 py-3 text-left">Categorie</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-center">Postări</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={cat.sortOrder}
                    onChange={async (e) => {
                      const token = localStorage.getItem("token");
                      await fetch("/api/help/categories", {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          id: cat.id,
                          sortOrder: parseInt(e.target.value) || 0,
                        }),
                      });
                      fetchCategories();
                    }}
                    className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.icon}
                    </span>
                    <div>
                      <div className="font-medium">{cat.name}</div>
                      {cat.isDefault && (
                        <span className="text-xs text-gray-400">Implicită</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-sm">{cat.slug}</td>
                <td className="px-4 py-3 text-center">{cat._count?.posts || 0}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      cat.isActive
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {cat.isActive ? "Activă" : "Inactivă"}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditingCategory(cat)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingCategory) && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowAddModal(false);
            setEditingCategory(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingCategory(null);
            fetchCategories();
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSave,
}: {
  category: HelpCategory | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || "",
    icon: category?.icon || "📦",
    color: category?.color || "#6B7280",
    description: category?.description || "",
    sortOrder: category?.sortOrder || 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const method = category ? "PUT" : "POST";
      const body = category
        ? { id: category.id, ...formData }
        : { ...formData, isAdmin: true };

      const res = await fetch("/api/help/categories", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        onSave();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error saving category:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {category ? "Editează Categoria" : "Adaugă Categorie"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Nume</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Culoare</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Descriere</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Ordine sortare</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
          </div>

          {/* Preview */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Previzualizare:</p>
            <div
              className="p-4 rounded-xl inline-flex items-center gap-3"
              style={{ backgroundColor: formData.color + "30" }}
            >
              <span
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: formData.color }}
              >
                {formData.icon}
              </span>
              <span className="font-medium">{formData.name || "Nume categorie"}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-amber-600 hover:bg-amber-700 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? "Se salvează..." : "Salvează"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
