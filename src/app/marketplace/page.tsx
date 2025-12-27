"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";

interface MarketplaceItem {
  id: string;
  type: string;
  name: string;
  description: string;
  price: number;
  documentType?: string;
  metalType?: string;
  availability: number;
}

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        let url = "/api/marketplace";
        if (filter !== "all") {
          url += `?type=${filter}`;
        }
        if (search) {
          url += `${filter !== "all" ? "&" : "?"}search=${search}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setItems(data.data);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [filter, search]);

  const handlePurchase = async (itemId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first");
      return;
    }

    try {
      const response = await fetch("/api/marketplace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId, quantity: 1 }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Purchase successful!");
        // Refresh items
        const listResponse = await fetch("/api/marketplace");
        const listData = await listResponse.json();
        if (listData.success) {
          setItems(listData.data);
        }
      } else {
        alert(data.error || "Purchase failed");
      }
    } catch (error) {
      alert("Error processing purchase");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Piața Imperiu Sui Luris</h1>
            <p className="text-gray-400">
              Cumpără documente, metale preț ioase și teren pentru a sprijini misiunea noastră
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-white bg-opacity-10 text-gray-300 hover:bg-opacity-20"
                }`}
              >
                Toate
              </button>
              <button
                onClick={() => setFilter("document")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === "document"
                    ? "bg-blue-600 text-white"
                    : "bg-white bg-opacity-10 text-gray-300 hover:bg-opacity-20"
                }`}
              >
                Documente
              </button>
              <button
                onClick={() => setFilter("resource")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === "resource"
                    ? "bg-blue-600 text-white"
                    : "bg-white bg-opacity-10 text-gray-300 hover:bg-opacity-20"
                }`}
              >
                Resurse
              </button>
            </div>
            <input
              type="text"
              placeholder="Caută..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-400 text-xl">Se încarcă...</p>
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden hover:bg-opacity-10 transition group"
                >
                  <div className="p-6">
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-cyan-300 transition">
                      {item.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                      {item.description}
                    </p>

                    <div className="mb-4 space-y-2">
                      <p className="text-sm">
                        <span className="text-gray-500">Tip:</span>{" "}
                        <span className="text-cyan-300 capitalize">{item.type}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500">Disponibilitate:</span>{" "}
                        <span className="text-cyan-300">{item.availability}</span>
                      </p>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-gray-400 text-xs">Preț</p>
                          <p className="text-2xl font-bold text-cyan-300">
                            {item.price}
                          </p>
                          <p className="text-xs text-gray-500">credite</p>
                        </div>
                        <button
                          onClick={() => handlePurchase(item.id)}
                          disabled={item.availability === 0}
                          className={`px-6 py-2 font-semibold rounded-lg transition ${
                            item.availability > 0
                              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/50"
                              : "bg-gray-600 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {item.availability > 0 ? "Cumpără" : "Stoc epuizat"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-xl">Nu s-au găsit articole</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
