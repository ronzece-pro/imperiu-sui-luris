"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
}

interface DocumentFormData {
  photoUrl: string;
  birthDate: string;
  birthPlace: string;
  cnp: string;
  address: string;
  nationality: string;
  sex: "M" | "F";
  height: string;
  eyeColor: string;
}

export default function AdminGrantDocuments() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [documentType, setDocumentType] = useState<"bulletin" | "passport" | "certificate" | "visitor_certificate">("bulletin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPersonalizationForm, setShowPersonalizationForm] = useState(false);
  const [formData, setFormData] = useState<DocumentFormData>({
    photoUrl: "",
    birthDate: "",
    birthPlace: "",
    cnp: "",
    address: "",
    nationality: "Imperiul Sui Juris",
    sex: "M",
    height: "",
    eyeColor: "",
  });

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

  const handleNext = () => {
    if (!selectedUser) {
      setMessage("❌ Selectează un utilizator");
      return;
    }
    setMessage("");
    setShowPersonalizationForm(true);
  };

  const handleBack = () => {
    setShowPersonalizationForm(false);
  };

  const handleGrant = async () => {
    if (!selectedUser) {
      setMessage("❌ Selectează un utilizator");
      return;
    }

    // Validare date obligatorii
    if (!formData.photoUrl) {
      setMessage("❌ URL-ul pozei este obligatoriu");
      return;
    }
    if (!formData.birthDate) {
      setMessage("❌ Data nașterii este obligatorie");
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
          personalization: formData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setSelectedUser("");
        setShowPersonalizationForm(false);
        // Reset form
        setFormData({
          photoUrl: "",
          birthDate: "",
          birthPlace: "",
          cnp: "",
          address: "",
          nationality: "Imperiul Sui Juris",
          sex: "M",
          height: "",
          eyeColor: "",
        });
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
          🎁 Oferă Documente Personalizate
        </h2>
        <p className="text-slate-300 text-sm">
          Completează datele personale și generează documente profesionale pentru utilizatori.
        </p>
      </div>

      {!showPersonalizationForm ? (
        // Step 1: Select User and Document Type
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

          {message && !showPersonalizationForm && (
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
            onClick={handleNext}
            disabled={!selectedUser}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Continuă la Personalizare →
          </button>
        </div>
      ) : (
        // Step 2: Personalization Form
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">📝 Date Personale</h3>
            <button
              onClick={handleBack}
              className="text-slate-400 hover:text-white transition"
            >
              ← Înapoi
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Photo Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fotografie *
              </label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Convert to base64
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, photoUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700 file:cursor-pointer"
                  />
                  <p className="text-xs text-slate-400 mt-1">Poză passport: max 2MB, format JPG/PNG</p>
                </div>
                {formData.photoUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={formData.photoUrl}
                      alt="Preview"
                      className="w-32 h-40 object-cover rounded-lg border-2 border-cyan-500 shadow-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data Nașterii *
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Birth Place */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Locul Nașterii
              </label>
              <input
                type="text"
                value={formData.birthPlace}
                onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                placeholder="București, România"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* CNP/Personal ID */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                CNP / ID Personal
              </label>
              <input
                type="text"
                value={formData.cnp}
                onChange={(e) => setFormData({ ...formData, cnp: e.target.value })}
                placeholder="1234567890123"
                maxLength={13}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Sex */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sex
              </label>
              <select
                value={formData.sex}
                onChange={(e) => setFormData({ ...formData, sex: e.target.value as "M" | "F" })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="M">Masculin</option>
                <option value="F">Feminin</option>
              </select>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Adresă
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Str. Principală nr. 123, Orașul, Județul"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cetățenie
              </label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Înălțime (cm)
              </label>
              <input
                type="text"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="175"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Eye Color */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Culoarea Ochilor
              </label>
              <input
                type="text"
                value={formData.eyeColor}
                onChange={(e) => setFormData({ ...formData, eyeColor: e.target.value })}
                placeholder="Căprui"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
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

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-xl transition"
            >
              ← Înapoi
            </button>
            <button
              onClick={handleGrant}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "🔄 Se generează..." : "✨ Generează Document"}
            </button>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm font-semibold mb-1">ℹ️ Informații:</p>
            <ul className="text-blue-200/80 text-xs space-y-1">
              <li>• Încarcă o poză de tip pașaport (fundal alb, dimensiune recomandată 600x800px)</li>
              <li>• Fișierul va fi convertit automat în base64 și salvat în document</li>
              <li>• Se va genera automat un cod de verificare unic</li>
              <li>• Seria documentului va fi generată automat</li>
              <li>• Datele vor fi folosite pentru a personaliza documentul</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
