"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

export default function EditDocumentPage() {
  const params = useParams<{ documentNumber: string }>();
  const router = useRouter();
  const documentNumber = params?.documentNumber;

  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
    }
  }, [router]);

  const handleSave = async () => {
    if (!photoUrl.trim()) {
      setMessage("Te rog introdu un URL valid pentru poză");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/documents/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentNumber, photoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Eroare la salvare");
        setLoading(false);
        return;
      }

      setMessage("✓ Document actualizat cu succes!");
      setTimeout(() => {
        router.push(`/documents/view/${data.document.id}`);
      }, 1500);
    } catch {
      setMessage("Eroare de rețea");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Personalizează Documentul
            </h1>
            <p className="text-slate-400 mb-8">Document: <span className="text-cyan-400 font-mono">{documentNumber}</span></p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  📸 URL Poză Profil
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Introdu URL-ul unei imagini (format: JPG, PNG, WebP). Recomandare: 400x500px
                </p>
              </div>

              {photoUrl && (
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-2">Preview:</p>
                  <div className="w-32 h-40 border-2 border-cyan-500/30 rounded-lg overflow-hidden">
                    <img 
                      src={photoUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={() => setMessage("⚠️ URL invalid sau imagine inaccesibilă")}
                    />
                  </div>
                </div>
              )}

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.startsWith("✓") 
                    ? "bg-green-500/10 border border-green-500/30 text-green-400" 
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}>
                  {message}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={loading || !photoUrl.trim()}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition shadow-lg disabled:cursor-not-allowed"
                >
                  {loading ? "Salvare..." : "💾 Salvează"}
                </button>
                <button
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                >
                  Înapoi
                </button>
              </div>
            </div>

            <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">💡 Sfaturi:</h3>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Folosește o poză cu fundal uniform</li>
                <li>• Asigură-te că fața este vizibilă frontal</li>
                <li>• Imaginea trebuie să fie publică (accesibilă online)</li>
                <li>• Pentru pașaport: 110x140px ideal</li>
                <li>• Pentru buletin/certificat: 100x120px ideal</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
