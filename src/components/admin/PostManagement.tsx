"use client";

import { useEffect, useState } from "react";

type ItemType = "document" | "land" | "resource";

interface MarketplaceItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: number;
  documentType?: "bulletin" | "passport" | "certificate";
  landZone?: string;
  landAreaSize?: number;
  landType?: "agricultural" | "forest" | "water" | "mixed";
  createdAt?: string;
}

export default function AdminPostManagement() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [createKind, setCreateKind] = useState<"document" | "land">("document");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    availability: 1,
    documentType: "bulletin" as "bulletin" | "passport" | "certificate",
    landZone: "",
    landAreaSize: 1000,
    landType: "mixed" as "agricultural" | "forest" | "water" | "mixed",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setItems([]);
        return;
      }

      const response = await fetch("/api/admin/marketplace", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data?.success) {
        setItems(data.data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      availability: 1,
      documentType: "bulletin",
      landZone: "",
      landAreaSize: 1000,
      landType: "mixed",
    });
  };

  const handleCreateItem = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      alert("Te rog completează numele și descrierea");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Trebuie să fii logat ca admin");
        return;
      }

      const payload: Record<string, unknown> = {
        type: createKind,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        currency: "credits",
        availability: formData.availability,
      };

      if (createKind === "document") {
        payload.documentType = formData.documentType;
      }

      if (createKind === "land") {
        payload.landZone = formData.landZone.trim();
        payload.landAreaSize = formData.landAreaSize;
        payload.landType = formData.landType;
      }

      const response = await fetch("/api/admin/marketplace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!data?.success) {
        alert(data?.error || "Eroare la crearea produsului");
        return;
      }

      resetForm();
      setShowCreateModal(false);
      await fetchItems();
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Eroare la crearea produsului");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Sunteți sigur că doriți să ștergeți acest produs?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Trebuie să fii logat ca admin");
        return;
      }

      const response = await fetch(`/api/admin/marketplace?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!data?.success) {
        alert(data?.error || "Eroare la ștergere");
        return;
      }

      await fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Eroare la ștergere");
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;

    if (!formData.name.trim() || !formData.description.trim()) {
      alert("Te rog completează numele și descrierea");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Trebuie să fii logat ca admin");
        return;
      }

      const payload: Record<string, unknown> = {
        id: selectedItem.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        availability: formData.availability,
      };

      if (selectedItem.type === "document") {
        payload.documentType = formData.documentType;
      }

      if (selectedItem.type === "land") {
        payload.landZone = formData.landZone.trim();
        payload.landAreaSize = formData.landAreaSize;
        payload.landType = formData.landType;
      }

      const response = await fetch("/api/admin/marketplace", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!data?.success) {
        alert(data?.error || "Eroare la editare");
        return;
      }

      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();
      await fetchItems();
    } catch (error) {
      console.error("Error editing item:", error);
      alert("Eroare la editare");
    }
  };

  const openEditModal = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      availability: item.availability,
      documentType: item.documentType || "bulletin",
      landZone: item.landZone || "",
      landAreaSize: item.landAreaSize || 1000,
      landType: item.landType || "mixed",
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Create Post Button */}
      <div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition w-full sm:w-auto"
        >
          ➕ Creează Produs Nou
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Se încarcă...</div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 hover:border-gray-700 transition"
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                    <span className="px-2 py-1 bg-gray-800 text-gray-200 text-xs rounded font-bold">
                      {item.type === "document" ? "📄 Act" : item.type === "land" ? "🌍 Teren" : "📦 Resursă"}
                    </span>
                    {item.type === "document" && item.documentType && (
                      <span className="px-2 py-1 bg-purple-900 text-purple-200 text-xs rounded font-bold">
                        {item.documentType}
                      </span>
                    )}
                    {item.type === "land" && typeof item.landAreaSize === "number" && (
                      <span className="px-2 py-1 bg-emerald-900 text-emerald-200 text-xs rounded font-bold">
                        {item.landAreaSize.toLocaleString()} m²
                      </span>
                    )}
                    <span className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded font-bold">
                      💰 {item.price}
                    </span>
                    {item.availability === 0 && (
                      <span className="px-2 py-1 bg-red-900 text-red-200 text-xs rounded font-bold">
                        Stoc epuizat
                      </span>
                    )}
                    {item.availability > 0 && (
                      <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded font-bold">
                        Stoc: {item.availability}
                      </span>
                    )}
                    {item.price > 0 && (
                      <span className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded font-bold">
                        credite
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    ID: {item.id}
                  </p>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4 line-clamp-3">{item.description}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(item)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                >
                  ✏️ Editare
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
                >
                  🗑️ Ștergere
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
            <p>Nu există produse încă</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">
              {showEditModal ? "Editare Produs" : "Produs Nou"}
            </h3>

            {!showEditModal && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setCreateKind("document")}
                  className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
                    createKind === "document" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  📄 Acte
                </button>
                <button
                  onClick={() => setCreateKind("land")}
                  className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
                    createKind === "land" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  🌍 Terenuri
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nume</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Introdu numele produsului..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descriere</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Introdu descrierea produsului..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Preț (credite)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: Number(e.target.value) || 0,
                      }))
                    }
                    step="1"
                    min="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Disponibilitate</label>
                  <input
                    type="number"
                    value={formData.availability}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        availability: Number(e.target.value) || 0,
                      }))
                    }
                    step="1"
                    min="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {(showEditModal ? selectedItem?.type === "document" : createKind === "document") && (
                <div>
                  <label className="block text-sm font-medium mb-2">Tip document</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        documentType: e.target.value as "bulletin" | "passport" | "certificate",
                      }))
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="bulletin">Buletin</option>
                    <option value="passport">Pașaport</option>
                    <option value="certificate">Certificat</option>
                  </select>
                </div>
              )}

              {(showEditModal ? selectedItem?.type === "land" : createKind === "land") && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Zonă</label>
                      <input
                        type="text"
                        value={formData.landZone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            landZone: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Ex: Central"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">m²</label>
                      <input
                        type="number"
                        value={formData.landAreaSize}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            landAreaSize: Number(e.target.value) || 0,
                          }))
                        }
                        step="1"
                        min="1"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tip teren</label>
                    <select
                      value={formData.landType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          landType: e.target.value as "agricultural" | "forest" | "water" | "mixed",
                        }))
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="agricultural">Agricol</option>
                      <option value="forest">Pădure</option>
                      <option value="water">Apă</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedItem(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
              >
                Anulare
              </button>
              <button
                onClick={showEditModal ? handleEditItem : handleCreateItem}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
              >
                {showEditModal ? "Salvare" : "Creează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
