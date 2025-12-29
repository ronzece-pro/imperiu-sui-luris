"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AuditLogEntry = {
  id: string;
  type: string;
  actorUserId?: string;
  actorName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [retentionDays, setRetentionDays] = useState(15);
  const [maxEntries, setMaxEntries] = useState(5000);
  const [settingsMessage, setSettingsMessage] = useState<string>("");
  const [settingsMessageKind, setSettingsMessageKind] = useState<"success" | "error">("success");

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/admin/audit/settings", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || !json?.success) return;
      const s = json.data?.auditSettings as { retentionDays?: number; maxEntries?: number };
      if (typeof s?.retentionDays === "number") setRetentionDays(s.retentionDays);
      if (typeof s?.maxEntries === "number") setMaxEntries(s.maxEntries);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setLogs([]);
        return;
      }

      const res = await fetch("/api/admin/audit?limit=300", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json?.success) {
        setLogs([]);
        return;
      }
      setLogs((json.data?.logs || []) as AuditLogEntry[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
    void fetchSettings();
     
  }, []);

  const saveSettings = async () => {
    try {
      setSettingsSaving(true);
      setSettingsMessage("");
      const token = localStorage.getItem("token");
      if (!token) {
        setSettingsMessageKind("error");
        setSettingsMessage("Trebuie să fii logat ca admin");
        return;
      }

      const res = await fetch("/api/admin/audit/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ retentionDays, maxEntries }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setSettingsMessageKind("error");
        setSettingsMessage(json?.error || json?.message || "Eroare");
        return;
      }

      setSettingsMessageKind("success");
      setSettingsMessage("Salvat");
      setTimeout(() => setSettingsMessage(""), 2000);
      await fetchLogs();
    } finally {
      setSettingsSaving(false);
    }
  };

  const sorted = useMemo(() => {
    return [...logs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Audit</h3>
          <div className="text-sm text-gray-400">Ultimele evenimente: {logs.length}</div>
        </div>
        <button
          onClick={() => void fetchLogs()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition"
        >
          Reîncarcă
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Setări retenție</div>
            <div className="text-xs text-gray-400">Controlează cât timp și câte loguri se păstrează.</div>
          </div>
          <button
            onClick={() => void saveSettings()}
            disabled={settingsLoading || settingsSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-sm font-medium transition"
          >
            {settingsSaving ? "Se salvează..." : "Salvează"}
          </button>
        </div>

        {settingsMessage ? (
          <div
            className={`mt-3 px-4 py-3 text-sm border border-gray-800 rounded-lg ${
              settingsMessageKind === "success" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
            }`}
          >
            {settingsMessage}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm text-gray-200">
            Zile retenție
            <input
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value || 0))}
              className="mt-2 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-gray-200">
            Max loguri
            <input
              type="number"
              min={100}
              max={100000}
              value={maxEntries}
              onChange={(e) => setMaxEntries(Number(e.target.value || 0))}
              className="mt-2 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Se încarcă...</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nu există loguri.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Când</th>
                  <th className="px-4 py-3 text-left font-semibold">Tip</th>
                  <th className="px-4 py-3 text-left font-semibold">Actor</th>
                  <th className="px-4 py-3 text-left font-semibold">Mesaj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sorted.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-800 transition">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("ro-RO")}</td>
                    <td className="px-4 py-3 text-gray-200">{l.type}</td>
                    <td className="px-4 py-3">
                      {l.actorUserId ? (
                        <>
                          <Link
                            href={`/admin/users/${encodeURIComponent(l.actorUserId)}`}
                            className="font-medium text-gray-200 hover:text-white underline"
                          >
                            {l.actorName || l.actorUserId}
                          </Link>
                          <div className="text-xs text-gray-500">{l.actorUserId}</div>
                        </>
                      ) : (
                        <div className="font-medium text-gray-200">{l.actorName || "—"}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="max-w-2xl truncate">{l.message}</div>
                      {(() => {
                        const geo = l.metadata?.["geo"] as unknown;
                        const geoObj = geo && typeof geo === "object" ? (geo as Record<string, unknown>) : null;
                        if (!geoObj) return null;
                        const city = geoObj["city"];
                        const region = geoObj["region"];
                        const country = geoObj["country"];
                        const org = geoObj["org"];
                        const loc = [city, region, country]
                          .filter((x) => typeof x === "string" && x.trim().length > 0)
                          .join(", ");
                        return (
                          <div className="text-xs text-gray-500 max-w-2xl truncate">
                            Locație: {loc || "—"}
                            {typeof org === "string" && org.trim() ? ` (${org})` : ""}
                          </div>
                        );
                      })()}
                      {l.metadata ? (
                        <div className="text-xs text-gray-500 max-w-2xl truncate">{JSON.stringify(l.metadata)}</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
