"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import WalletPanel from "@/components/wallet/WalletPanel";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  joinDate?: string;
  country?: string;
  status?: string;
  avatar?: string;
  isPrivate?: boolean;
}

interface Document {
  id: string;
  type: string;
  name: string;
  issuedDate: string;
}

interface LandProperty {
  id: string;
  name: string;
  area: number;
  location: string;
  price: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [properties, setProperties] = useState<LandProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      
      if (!token) {
        router.push("/auth/login");
        return;
      }

      try {
        // Use stored user data as fallback
        let userData: UserProfile | null = null;
        if (userStr) {
          userData = JSON.parse(userStr);
        }

        const response = await fetch("/api/users", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success && data.data.user) {
          setUser(data.data.user);
          setDocuments(data.data.documents || []);
          setProperties(data.data.properties || []);
          setEditName(data.data.user.name);
          setEditEmail(data.data.user.email);
        } else if (userData) {
          // Fallback to localStorage data
          setUser(userData);
          setEditName(userData.name);
          setEditEmail(userData.email);
          setDocuments([]);
          setProperties([]);
        } else {
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Try to use localStorage data as fallback
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setEditName(userData.name);
          setEditEmail(userData.email);
        } else {
          router.push("/auth/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handlePrivacyToggle = () => {
    if (user) {
      setUser({ ...user, isPrivate: !user.isPrivate });
      setMessage(`Profil setat ca ${!user.isPrivate ? "privat" : "public"}`);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleSaveProfile = async () => {
    if (editPassword && editPassword !== confirmPassword) {
      setMessage("Parolele nu se potrivesc!");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: editPassword || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser({ ...user!, name: editName, email: editEmail });
        localStorage.setItem("user", JSON.stringify(data.data.user));
        setIsEditing(false);
        setEditPassword("");
        setConfirmPassword("");
        setMessage("Profil actualizat cu succes!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(data.error || "Eroare la actualizare");
      }
    } catch (error) {
      setMessage("Eroare la salvare");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <p className="text-gray-400 text-lg">Se încarcă...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <p className="text-gray-400 text-lg">Profil nu găsit</p>
        </div>
      </>
    );
  }

  const totalLandArea = properties.reduce((sum, prop) => sum + prop.area, 0);
  const totalDocuments = documents.length;
  
  // Provide defaults for user properties
  const userRole = user?.role || "Cetățean";
  const userCountry = user?.country || "Imperiul Sui Luris";
  const userJoinDate = user?.joinDate || new Date().toISOString();
  const userIsPrivate = user?.isPrivate ?? false;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
          {/* Header Card */}
          {user && (
          <div className="bg-white bg-opacity-5 backdrop-blur-lg border border-slate-700 rounded-2xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl">
                  {user.name && user.name.length > 0 ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{user.name || "Utilizator"}</h1>
                  <p className="text-sm sm:text-base text-gray-400">{user.email || "noemail@domain.com"}</p>
                  <p className="text-xs sm:text-sm text-cyan-300 mt-1">Membru din {new Date(userJoinDate).toLocaleDateString("ro-RO")}</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePrivacyToggle}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition ${
                    userIsPrivate
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {userIsPrivate ? "🔒 Privat" : "🌍 Public"}
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition"
                >
                  {isEditing ? "Anulare" : "✏️ Editare"}
                </button>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className="bg-green-500 bg-opacity-20 border border-green-400 text-green-300 px-4 py-3 rounded-lg text-sm mb-4">
                {message}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white bg-opacity-5 rounded-lg p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-cyan-300">{totalDocuments}</p>
                <p className="text-xs sm:text-sm text-gray-400">Documente</p>
              </div>
              <div className="bg-white bg-opacity-5 rounded-lg p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-cyan-300">{totalLandArea}</p>
                <p className="text-xs sm:text-sm text-gray-400">m² Teren</p>
              </div>
              <div className="bg-white bg-opacity-5 rounded-lg p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-cyan-300">{properties.length}</p>
                <p className="text-xs sm:text-sm text-gray-400">Proprietăți</p>
              </div>
              <div className="bg-white bg-opacity-5 rounded-lg p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-cyan-300">{userRole}</p>
                <p className="text-xs sm:text-sm text-gray-400">Rol</p>
              </div>
            </div>
          </div>
          )}

          {/* Tabs */}
          <div className="mb-6 md:mb-8">
            <div className="flex gap-2 sm:gap-4 border-b border-slate-700 overflow-x-auto">
              {["overview", "documents", "properties", "wallet", "settings"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "overview" && "📊 Prezentare"}
                  {tab === "documents" && "📄 Documente"}
                  {tab === "properties" && "🏠 Proprietăți"}
                  {tab === "wallet" && "💰 Portofel"}
                  {tab === "settings" && "⚙️ Setări"}
                </button>
              ))}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-white bg-opacity-5 backdrop-blur-lg border border-slate-700 rounded-xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Informații Personale</h3>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
                  <div>
                    <p className="text-gray-400">Nume Complet</p>
                    <p className="text-white font-semibold">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base text-gray-400">Email</p>
                    <p className="text-white font-semibold break-all">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Țară</p>
                    <p className="text-white font-semibold">{userCountry}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Statut Profil</p>
                    <p className={`font-semibold ${userIsPrivate ? "text-red-400" : "text-green-400"}`}>
                      {userIsPrivate ? "Privat" : "Public"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white bg-opacity-5 backdrop-blur-lg border border-slate-700 rounded-xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Rezumat Activități</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm sm:text-base">Documente Deținute</span>
                    <span className="text-cyan-300 font-bold text-lg sm:text-xl">{totalDocuments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm sm:text-base">Teren Total (m²)</span>
                    <span className="text-cyan-300 font-bold text-lg sm:text-xl">{totalLandArea}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm sm:text-base">Proprietăți Active</span>
                    <span className="text-cyan-300 font-bold text-lg sm:text-xl">{properties.length}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-700">
                    <Link
                      href="/marketplace"
                      className="inline-block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
                    >
                      Cumpără Mai Mult
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div className="bg-white bg-opacity-5 backdrop-blur-lg border border-slate-700 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Documentele Mele</h3>
              {documents.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition"
                    >
                      <div className="flex-1 mb-3 sm:mb-0">
                        <h4 className="font-semibold text-white text-sm sm:text-base">{doc.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Tip: {doc.type} | Emis: {new Date(doc.issuedDate).toLocaleDateString("ro-RO")}
                        </p>
                      </div>
                      <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition">
                        📥 Descarcă
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-400 text-sm sm:text-base mb-4">Nu ai documente încă</p>
                  <Link
                    href="/marketplace"
                    className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
                  >
                    Cumpără Document
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Properties Tab */}
          {activeTab === "properties" && (
            <div className="bg-white bg-opacity-5 backdrop-blur-lg border border-slate-700 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Proprietățile Mele</h3>
              {properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {properties.map((prop) => (
                    <div
                      key={prop.id}
                      className="bg-slate-800 rounded-lg p-4 sm:p-6 hover:bg-slate-700 transition border border-slate-700"
                    >
                      <h4 className="font-bold text-white text-base sm:text-lg mb-2">{prop.name}</h4>
                      <div className="space-y-2 mb-4">
                        <p className="text-xs sm:text-sm text-gray-400">
                          <span className="font-semibold">Locație:</span> {prop.location}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          <span className="font-semibold">Suprafață:</span> {prop.area} m²
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          <span className="font-semibold">Valoare:</span> {prop.price} credite
                        </p>
                      </div>
                      <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition">
                        Detalii
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-400 text-sm sm:text-base mb-4">Nu ai proprietăți încă</p>
                  <Link
                    href="/marketplace"
                    className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
                  >
                    Cumpără Teren
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="bg-white bg-opacity-5 backdrop-blur-lg border border-slate-700 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Setări Cont</h3>

              {isEditing ? (
                <form className="space-y-4 sm:space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nume Complet</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 text-sm"
                    />
                  </div>

                  <div className="border-t border-slate-700 pt-4 sm:pt-6">
                    <h4 className="text-base font-semibold text-white mb-3 sm:mb-4">Schimbă Parolă</h4>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Parolă Nouă</label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Lasă gol dacă nu vrei să schimbi"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Confirmă Parolă</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmă parolă nouă"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition"
                    >
                      💾 Salvează Schimbări
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditPassword("");
                        setConfirmPassword("");
                      }}
                      className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold text-sm transition"
                    >
                      Anulare
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 sm:space-y-6 max-w-2xl">
                  <div className="bg-slate-800 rounded-lg p-4 sm:p-6">
                    <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">Privacy</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm">Statutul Profilului</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {userIsPrivate ? "Profil privat - doar tu poți vedea" : "Profil public - toți pot vedea"}
                        </p>
                      </div>
                      <button
                        onClick={handlePrivacyToggle}
                        className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition ${
                          userIsPrivate
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {userIsPrivate ? "🔒 Privat" : "🌍 Public"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-4 sm:p-6">
                    <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">Siguranță</h4>
                    <p className="text-gray-300 text-xs sm:text-sm mb-4">Schimbă-ți credențialele pentru a proteja contul</p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition"
                    >
                      Editează Profil
                    </button>
                  </div>

                  <div className="bg-red-950 bg-opacity-30 border border-red-700 rounded-lg p-4 sm:p-6">
                    <h4 className="font-semibold text-red-400 mb-3 text-sm sm:text-base">Zonă Periculoasă</h4>
                    <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition">
                      Șterge Cont
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Wallet Tab */}
          {activeTab === "wallet" && (
            <WalletPanel />
          )}
    
        </div>
      </div>
    </>
  );
}
