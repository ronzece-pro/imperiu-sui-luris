"use client";

import { useState } from "react";

interface VerificationResult {
  document: {
    id: string;
    type: string;
    documentNumber: string;
    verificationCode?: string;
    issueDate: string;
    expiryDate?: string;
    photoUrl?: string;
    birthDate?: string;
    birthPlace?: string;
    cnp?: string;
    address?: string;
    nationality?: string;
    sex?: string;
    height?: string;
    eyeColor?: string;
    status: string;
    html?: string;
  };
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
    country: string;
    citizenship: string;
    role?: string;
    badge?: string;
    accountStatus?: string;
    isVerified?: boolean;
  } | null;
  allDocuments: Array<{
    id: string;
    type: string;
    documentNumber: string;
    issueDate: string;
    status: string;
  }>;
  stats: {
    totalDocuments: number;
    totalLandArea: number;
    propertyCount: number;
  };
}

export default function AdminVerifyDocuments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<VerificationResult | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setMessage("❌ Introdu un cod de verificare sau serie document");
      return;
    }

    setLoading(true);
    setMessage("");
    setResults([]);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/verify-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          searchQuery: searchQuery.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.data.results && data.data.results.length > 0) {
          setResults(data.data.results);
          setMessage(`✅ Am găsit ${data.data.count} document${data.data.count > 1 ? 'e' : ''}`);
        } else {
          setMessage("⚠️ Nu s-au găsit documente cu acest cod sau serie");
        }
      } else {
        setMessage(`❌ ${data.error || "Eroare la căutare"}`);
      }
    } catch (error) {
      console.error("Error searching document:", error);
      setMessage("❌ Eroare de rețea");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("ro-RO");
  };

  const docTypeNames: Record<string, string> = {
    bulletin: "Buletin de Identitate",
    passport: "Pașaport",
    certificate: "Certificat de Cetățenie",
    visitor_certificate: "Certificat de Vizitator",
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          🔍 Verificare Documente
        </h2>
        <p className="text-slate-300 text-sm">
          Caută după cod de verificare sau serie document pentru a vedea toate detaliile utilizatorului.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Cod Verificare sau Serie Document
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ex: ABCD-1234 sau ISJ-PSP-DUM95121547"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold rounded-lg transition disabled:cursor-not-allowed"
            >
              {loading ? "🔄 Caut..." : "🔍 Caută"}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg border ${
              message.startsWith("✅")
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : message.startsWith("⚠️")
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
            >
              {/* Document Header */}
              <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {docTypeNames[result.document.type] || result.document.type}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Serie: <span className="text-cyan-400 font-mono">{result.document.documentNumber}</span>
                  </p>
                  {result.document.verificationCode && (
                    <p className="text-slate-400 text-sm">
                      Cod: <span className="text-purple-400 font-mono">{result.document.verificationCode}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDocument(selectedDocument?.document.id === result.document.id ? null : result)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  {selectedDocument?.document.id === result.document.id ? "Ascunde Detalii" : "Detalii Complete"}
                </button>
              </div>

              {/* User Info */}
              {result.user && (
                <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    👤 Utilizator
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Nume Complet</p>
                      <p className="text-white font-semibold">{result.user.fullName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Username</p>
                      <p className="text-white font-semibold">@{result.user.username}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Email</p>
                      <p className="text-white font-semibold break-all">{result.user.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Țară</p>
                      <p className="text-white font-semibold">{result.user.country}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Cetățenie</p>
                      <p className={`font-semibold ${result.user.citizenship === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {result.user.citizenship === 'active' ? '✓ Activă' : result.user.citizenship}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Verificat</p>
                      <p className={`font-semibold ${result.user.isVerified ? 'text-green-400' : 'text-red-400'}`}>
                        {result.user.isVerified ? '✓ Da' : '✗ Nu'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Rol</p>
                      <p className="text-white font-semibold">{result.user.role || 'user'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Badge</p>
                      <p className="text-white font-semibold">{result.user.badge || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Personal Data */}
              <div className="p-4 bg-slate-800/80 border-b border-slate-700">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  📋 Date Document
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Data Emiterii</p>
                    <p className="text-white font-semibold">{formatDate(result.document.issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Data Expirării</p>
                    <p className="text-white font-semibold">{formatDate(result.document.expiryDate)}</p>
                  </div>
                  {result.document.birthDate && (
                    <div>
                      <p className="text-slate-400">Data Nașterii</p>
                      <p className="text-white font-semibold">{formatDate(result.document.birthDate)}</p>
                    </div>
                  )}
                  {result.document.birthPlace && (
                    <div>
                      <p className="text-slate-400">Locul Nașterii</p>
                      <p className="text-white font-semibold">{result.document.birthPlace}</p>
                    </div>
                  )}
                  {result.document.cnp && (
                    <div>
                      <p className="text-slate-400">CNP</p>
                      <p className="text-white font-semibold font-mono">{result.document.cnp}</p>
                    </div>
                  )}
                  {result.document.sex && (
                    <div>
                      <p className="text-slate-400">Sex</p>
                      <p className="text-white font-semibold">{result.document.sex === 'M' ? 'Masculin' : 'Feminin'}</p>
                    </div>
                  )}
                  {result.document.height && (
                    <div>
                      <p className="text-slate-400">Înălțime</p>
                      <p className="text-white font-semibold">{result.document.height} cm</p>
                    </div>
                  )}
                  {result.document.eyeColor && (
                    <div>
                      <p className="text-slate-400">Culoarea Ochilor</p>
                      <p className="text-white font-semibold">{result.document.eyeColor}</p>
                    </div>
                  )}
                  {result.document.nationality && (
                    <div className="col-span-2">
                      <p className="text-slate-400">Cetățenie</p>
                      <p className="text-white font-semibold">{result.document.nationality}</p>
                    </div>
                  )}
                  {result.document.address && (
                    <div className="col-span-2">
                      <p className="text-slate-400">Adresă</p>
                      <p className="text-white font-semibold">{result.document.address}</p>
                    </div>
                  )}
                </div>

                {result.document.photoUrl && (
                  <div className="mt-4">
                    <p className="text-slate-400 text-sm mb-2">Fotografie</p>
                    <img
                      src={result.document.photoUrl}
                      alt="Document Photo"
                      className="w-32 h-40 object-cover rounded-lg border-2 border-cyan-500"
                    />
                  </div>
                )}
              </div>

              {/* Extended Details */}
              {selectedDocument?.document.id === result.document.id && (
                <>
                  {/* All User Documents */}
                  <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      📄 Toate Documentele Utilizatorului ({result.allDocuments.length})
                    </h4>
                    <div className="space-y-2">
                      {result.allDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                          <div>
                            <p className="text-white font-semibold">{docTypeNames[doc.type] || doc.type}</p>
                            <p className="text-slate-400 text-xs font-mono">{doc.documentNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-400 text-xs">Emis: {formatDate(doc.issueDate)}</p>
                            <p className={`text-xs font-semibold ${doc.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                              {doc.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      📊 Statistici
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-slate-900 rounded-lg">
                        <p className="text-2xl font-bold text-cyan-400">{result.stats.totalDocuments}</p>
                        <p className="text-slate-400 text-sm">Documente</p>
                      </div>
                      <div className="text-center p-3 bg-slate-900 rounded-lg">
                        <p className="text-2xl font-bold text-cyan-400">{result.stats.totalLandArea}</p>
                        <p className="text-slate-400 text-sm">m² Teren</p>
                      </div>
                      <div className="text-center p-3 bg-slate-900 rounded-lg">
                        <p className="text-2xl font-bold text-cyan-400">{result.stats.propertyCount}</p>
                        <p className="text-slate-400 text-sm">Proprietăți</p>
                      </div>
                    </div>
                  </div>

                  {/* Full Document Preview */}
                  {result.document.html && (
                    <div className="p-4 bg-slate-900">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        🖼️ Preview Document Complet
                      </h4>
                      <div className="bg-white rounded-lg overflow-hidden border-2 border-cyan-500">
                        <iframe
                          srcDoc={result.document.html}
                          className="w-full h-[500px]"
                          title="Document Preview"
                          sandbox="allow-scripts allow-same-origin"
                          style={{ transform: 'scale(0.75)', transformOrigin: 'top center', height: '667px' }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
