"use client";

import { useEffect, useMemo, useState } from "react";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                      <div className="font-medium text-gray-200">{l.actorName || l.actorUserId || "—"}</div>
                      {l.actorUserId ? <div className="text-xs text-gray-500">{l.actorUserId}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="max-w-2xl truncate">{l.message}</div>
                      {l.metadata ? <div className="text-xs text-gray-500 max-w-2xl truncate">{JSON.stringify(l.metadata)}</div> : null}
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
