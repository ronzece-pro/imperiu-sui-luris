"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
}

export default function AdminGrantDocuments() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [documentType, setDocumentType] = useState<"bulletin" | "passport" | "certificate" | "visitor_certificate">("bulletin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleGrant = async () => {
    if (!selectedUser) {
      setMessage("❌ Selectează un utilizator");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/grant-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUser,
          documentType,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setSelectedUser("");
      } else {
        setMessage(`❌ ${data.error || "Eroare la oferirea documentului"}`);
      }
    } catch (error) {
      console.error("Error granting document:", error);
      setMessage("❌ Eroare de rețea");
    } finally {
      setLoading(false);
    }
  };

  const selectedUserData = users.find((u) => u.id === selectedUser);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          🎁 Oferă Documente Gratuit
        </h2>
        <p className="text-slate-300 text-sm">
          Ca administrator, poți oferi orice tip de document oricărui utilizator fără costuri.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Selectează Utilizatorul
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">-- Alege utilizator --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} (@{user.username}) - {user.email}
              </option>
            ))}
          </select>
        </div>

        {selectedUserData && (
          <div className="p-4 bg-slate-900/50 border border-slate-600 rounded-lg">
            <p className="text-sm text-slate-400">Utilizator selectat:</p>
            <p className="text-white font-semibold">{selectedUserData.fullName}</p>
            <p className="text-slate-400 text-sm">@{selectedUserData.username} • {selectedUserData.email}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tip Document
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDocumentType("bulletin")}
              className={`p-4 rounded-lg border-2 transition ${
                documentType === "bulletin"
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                  : "border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="text-2xl mb-1">🪪</div>
              <div className="font-semibold">Buletin</div>
              <div className="text-xs opacity-75">Card de identitate</div>
            </button>

            <button
              onClick={() => setDocumentType("passport")}
              className={`p-4 rounded-lg border-2 transition ${
                documentType === "passport"
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                  : "border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="text-2xl mb-1">📘</div>
              <div className="font-semibold">Pașaport</div>
              <div className="text-xs opacity-75">Valabilitate 10 ani</div>
            </button>

            <button
              onClick={() => setDocumentType("certificate")}
              className={`p-4 rounded-lg border-2 transition ${
                documentType === "certificate"
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                  : "border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="text-2xl mb-1">📜</div>
              <div className="font-semibold">Certificat</div>
              <div className="text-xs opacity-75">Valabilitate 1 an</div>
            </button>

            <button
              onClick={() => setDocumentType("visitor_certificate")}
              className={`p-4 rounded-lg border-2 transition ${
                documentType === "visitor_certificate"
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                  : "border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="text-2xl mb-1">🎫</div>
              <div className="font-semibold">Certificat Vizitator</div>
              <div className="text-xs opacity-75">Valabilitate 3 luni + acces chat</div>
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg border ${
              message.startsWith("✅")
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {message}
          </div>
        )}

        <button
          onClick={handleGrant}
          disabled={loading || !selectedUser}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? "🔄 Se procesează..." : "🎁 Oferă Document Gratuit"}
        </button>

        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm font-semibold mb-1">ℹ️ Informații:</p>
          <ul className="text-blue-200/80 text-xs space-y-1">
            <li>• Documentele oferite sunt gratuite (0 LURIS)</li>
            <li>• Certificatul vizitator oferă acces temporar la chat (3 luni)</li>
            <li>• Utilizatorul va primi documentul imediat în profilul său</li>
            <li>• Toate acțiunile sunt înregistrate în audit log</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
