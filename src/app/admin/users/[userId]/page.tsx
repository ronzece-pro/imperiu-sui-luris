"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

type UserRow = {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  citizenship?: string;
  role?: string;
  badge?: string;
  accountStatus?: string;
  isVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type AuditLogEntry = {
  id: string;
  type: string;
  actorUserId?: string;
  actorName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();

  const userId = decodeURIComponent(params.userId);

  const [user, setUser] = useState<UserRow | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const [uRes, aRes] = await Promise.all([
        fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`/api/admin/audit?actorUserId=${encodeURIComponent(userId)}&limit=300`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const uJson = await uRes.json();
      if (!uRes.ok || !uJson?.success) {
        setUser(null);
        setLogs([]);
        setError(uJson?.error || uJson?.message || "Nu pot încărca utilizatorul");
        return;
      }

      const aJson = await aRes.json();

      setUser((uJson.data?.user || null) as UserRow | null);
      setLogs(((aJson?.data?.logs || []) as AuditLogEntry[]) || []);
    } catch {
      setError("Eroare de rețea");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const displayName = useMemo(() => {
    if (!user) return userId;
    return user.fullName || user.username || user.email || user.id;
  }, [user, userId]);

  const toggleVerified = async () => {
    if (!user) return;
    try {
      setSaving(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) return;

      const next = !Boolean(user.isVerified);
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id, isVerified: next }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.error || json?.message || "Nu s-a putut salva");
        return;
      }

      setUser((prev) => (prev ? { ...prev, isVerified: next } : prev));
    } catch {
      setError("Eroare de rețea");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{displayName}</h1>
              <div className="text-sm text-gray-400 break-all">{userId}</div>
            </div>
            <button
              type="button"
              onClick={() => void fetchAll()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition text-white"
            >
              Reîncarcă
            </button>
          </div>

          {error ? (
            <div className="mb-6 p-4 rounded-lg bg-red-900/40 border border-red-800 text-red-100">{error}</div>
          ) : null}

          <div className="bg-white/5 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 sm:p-6 mb-6">
            {loading ? (
              <div className="text-gray-300">Se încarcă...</div>
            ) : !user ? (
              <div className="text-gray-300">Utilizator inexistent.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-400">Email:</span> {user.email}
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-400">Rol:</span> {user.role || "user"}
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-400">Status:</span> {user.accountStatus || "active"}
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-400">Cetățenie:</span> {user.citizenship || "—"}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-400">Verificat:</span> {user.isVerified ? "da" : "nu"}
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleVerified()}
                    disabled={saving || loading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition border disabled:opacity-60 ${
                      user.isVerified
                        ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                        : "bg-green-700/30 border-green-700 text-green-100 hover:bg-green-700/40"
                    }`}
                  >
                    {saving ? "Se salvează..." : user.isVerified ? "Marchează ne-verificat" : "Marchează verificat"}
                  </button>
                  <div className="text-xs text-gray-500">
                    Notă: locația exactă nu e disponibilă fără un serviciu GeoIP; logăm IP + user-agent.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-white font-bold">Audit (activitate)</div>
                <div className="text-xs text-gray-500">Ultimele {logs.length} evenimente</div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400">Se încarcă...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nu există loguri.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Când</th>
                      <th className="px-4 py-3 text-left font-semibold">Tip</th>
                      <th className="px-4 py-3 text-left font-semibold">Mesaj</th>
                      <th className="px-4 py-3 text-left font-semibold">Detalii</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-800 transition">
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("ro-RO")}</td>
                        <td className="px-4 py-3 text-gray-200">{l.type}</td>
                        <td className="px-4 py-3 text-gray-300 max-w-xl truncate">{l.message}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xl truncate">
                          {l.metadata ? JSON.stringify(l.metadata) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
