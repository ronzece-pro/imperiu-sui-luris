"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminUserManagement from "@/components/admin/UserManagement";
import AdminPostManagement from "@/components/admin/PostManagement";
import AdminStripeSettings from "@/components/admin/StripeSettings";
import AdminMetaMaskSettings from "@/components/admin/MetaMaskSettings";
import AdminLurisManagement from "@/components/admin/LurisManagement";
import AdminLegalPages from "@/components/admin/LegalPages";
import AdminChatModeration from "@/components/admin/ChatModeration";
import AdminChatReports from "@/components/admin/ChatReports";
import AdminVerificationRequests from "@/components/admin/VerificationRequests";
import AdminAuditLogs from "@/components/admin/AuditLogs";
import AdminEmailSettings from "@/components/admin/EmailSettings";

interface AdminStats {
  totalUsers: number;
  totalBalance: number;
  totalTransactions: number;
  totalPosts: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reportCount, setReportCount] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalBalance: 0,
    totalTransactions: 0,
    totalPosts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // Check if user is owner
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      // Verify owner access (in production, verify on backend)
      const isAdminUser = user?.role === "admin" || user?.email?.includes("admin");
      
      if (!isAdminUser) {
        router.push("/dashboard");
        return;
      }

      setIsOwner(true);
      setUserName(user?.fullName || user?.username || user?.email || "Admin");
      
      // Fetch admin stats
      fetchAdminStats();
      fetchAdminBadges();
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/auth/login");
    }
  }, [router]);

  const fetchAdminBadges = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setReportCount(0);
        setPendingVerifications(0);
        return;
      }

      const lastSeenReportsAt = Number(localStorage.getItem("admin_lastSeenReportsAt") || 0);
      const lastSeenVerificationsAt = Number(localStorage.getItem("admin_lastSeenVerificationsAt") || 0);

      const [reportsRes, verRes] = await Promise.all([
        fetch("/api/admin/chat/reports", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/verification?limit=200", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const reportsJson = await reportsRes.json().catch(() => null);
      const verJson = await verRes.json().catch(() => null);

      const reports = (reportsJson?.data?.reports || []) as Array<{ createdAt?: string | Date }>;
      const newReports = reports.filter((r) => +new Date(r.createdAt || 0) > lastSeenReportsAt).length;

      const requests = (verJson?.data?.requests || []) as Array<{ createdAt?: string | Date; status?: string }>;
      const newPendingVerifications = requests.filter(
        (r) => r.status === "pending" && +new Date(r.createdAt || 0) > lastSeenVerificationsAt
      ).length;

      setReportCount(newReports);
      setPendingVerifications(newPendingVerifications);
    } catch {
      // ignore
    }
  };

  const fetchAdminStats = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setStats({ totalUsers: 0, totalBalance: 0, totalTransactions: 0, totalPosts: 0 });
        return;
      }

      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!data?.success) {
        setStats({ totalUsers: 0, totalBalance: 0, totalTransactions: 0, totalPosts: 0 });
        return;
      }

      setStats(data.data as AdminStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/");
  };

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 text-lg">Acces neautorizat</p>
          <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">
            Înapoi la acasă
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Navigation */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-bold text-sm">
              A
            </div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/dashboard" className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium transition">
                Dashboard
              </Link>
              <Link href="/marketplace" className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium transition">
                Piață
              </Link>
              <Link href="/chat" className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium transition">
                Chat
              </Link>
            </div>
            <span className="text-sm text-gray-400">Bine ai venit, {userName}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
            >
              Delogare
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
        {/* Sidebar Navigation */}
        <div className="bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 md:w-64 flex-shrink-0 p-4 sm:p-6">
          <nav className="space-y-2">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "users", label: "Utilizatori", icon: "👥" },
              { id: "posts", label: "Postări", icon: "📝" },
              { id: "chat", label: "Chat", icon: "💬" },
              { id: "reports", label: "Rapoarte", icon: "🚨", badge: reportCount },
              { id: "verifications", label: "Verificări", icon: "✅", badge: pendingVerifications },
              { id: "audit", label: "Audit", icon: "🧾" },
              { id: "payments", label: "Plăți", icon: "💳" },
              { id: "email", label: "Email", icon: "✉️" },
              { id: "luris", label: "Luris Points", icon: "💎" },
              { id: "legal", label: "Pagini Legale", icon: "⚖️" },
              { id: "settings", label: "Setări", icon: "⚙️" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  const now = Date.now();
                  if (item.id === "reports") localStorage.setItem("admin_lastSeenReportsAt", String(now));
                  if (item.id === "verifications") localStorage.setItem("admin_lastSeenVerificationsAt", String(now));
                  setActiveTab(item.id);
                  void fetchAdminBadges();
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm transition ${
                  activeTab === item.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="inline-flex items-center justify-between w-[calc(100%-24px)]">
                  <span>{item.label}</span>
                  {typeof (item as any).badge === "number" && (item as any).badge > 0 ? (
                    <span className="ml-2 text-[10px] leading-none px-2 py-1 rounded-full bg-red-600 text-white">
                      {(item as any).badge}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="p-4 sm:p-8">
              <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Utilizatori Total</p>
                      <p className="text-2xl sm:text-3xl font-bold mt-2">
                        {isLoading ? "..." : stats.totalUsers}
                      </p>
                    </div>
                    <span className="text-4xl opacity-30">👥</span>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Sold Total</p>
                      <p className="text-2xl sm:text-3xl font-bold mt-2">
                        {isLoading ? "..." : `$${stats.totalBalance.toLocaleString()}`}
                      </p>
                    </div>
                    <span className="text-4xl opacity-30">💰</span>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Tranzacții</p>
                      <p className="text-2xl sm:text-3xl font-bold mt-2">
                        {isLoading ? "..." : stats.totalTransactions}
                      </p>
                    </div>
                    <span className="text-4xl opacity-30">💳</span>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Postări</p>
                      <p className="text-2xl sm:text-3xl font-bold mt-2">
                        {isLoading ? "..." : stats.totalPosts}
                      </p>
                    </div>
                    <span className="text-4xl opacity-30">📝</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Acțiuni Rapide</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab("users")}
                    className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left font-medium transition"
                  >
                    👥 Gestionare Utilizatori
                  </button>
                  <button
                    onClick={() => setActiveTab("posts")}
                    className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left font-medium transition"
                  >
                    📝 Gestionare Postări
                  </button>
                  <button
                    onClick={() => setActiveTab("payments")}
                    className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left font-medium transition"
                  >
                    💳 Gestionare Plăți
                  </button>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left font-medium transition"
                  >
                    ⚙️ Setări Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="p-4 sm:p-8">
              <h2 className="text-3xl font-bold mb-6">Gestionare Utilizatori</h2>
              <AdminUserManagement />
            </div>
          )}

          {activeTab === "chat" && (
            <div className="p-4 sm:p-8">
              <AdminChatModeration />
            </div>
          )}

          {activeTab === "reports" && (
            <div className="p-4 sm:p-8">
              <AdminChatReports />
            </div>
          )}

          {activeTab === "verifications" && (
            <div className="p-4 sm:p-8">
              <AdminVerificationRequests />
            </div>
          )}

          {activeTab === "audit" && (
            <div className="p-4 sm:p-8">
              <AdminAuditLogs />
            </div>
          )}

          {activeTab === "email" && (
            <div className="p-4 sm:p-8">
              <h2 className="text-3xl font-bold mb-6">Setări Email</h2>
              <AdminEmailSettings />
            </div>
          )}

          {/* Posts Tab */}
          {activeTab === "posts" && (
            <div className="p-4 sm:p-8">
              <h2 className="text-3xl font-bold mb-6">Gestionare Postări</h2>
              <AdminPostManagement />
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="p-4 sm:p-8">
              <h2 className="text-3xl font-bold mb-6">Gestionare Plăți</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-4">💳 Stripe</h3>
                  <AdminStripeSettings />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">🔗 MetaMask</h3>
                  <AdminMetaMaskSettings />
                </div>
              </div>
            </div>
          )}

          {/* Luris Tab */}
          {activeTab === "luris" && (
            <div className="p-4 sm:p-8">
              <h2 className="text-3xl font-bold mb-6">Gestionare Luris Points</h2>
              <AdminLurisManagement />
            </div>
          )}

          {/* Legal Tab */}
          {activeTab === "legal" && (
            <div className="p-4 sm:p-8">
              <h2 className="text-3xl font-bold mb-6">Pagini Legale</h2>
              <AdminLegalPages />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="p-4 sm:p-8">
              <h2 className="text-3xl font-bold mb-6">Setări Admin</h2>
              <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="font-bold mb-4">ℹ️ Informații Admin</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tip Cont:</span>
                      <span className="font-bold">Owner (Admin Plin)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Permisiuni:</span>
                      <span className="font-bold">Toate</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="font-bold text-green-400">Activ</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="font-bold mb-4">🔒 Securitate</h3>
                  <div className="space-y-3">
                    <button className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition text-left">
                      🔑 Schimbă Parola Admin
                    </button>
                    <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition text-left">
                      ⚠️ Resetează Sesiuni Active
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="font-bold mb-4">📊 Sistem</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Versiune App:</span>
                      <span className="font-mono">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status Bază Date:</span>
                      <span className="font-bold text-green-400">Online</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">API Status:</span>
                      <span className="font-bold text-green-400">Funcțional</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
