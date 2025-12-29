"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ChatReport = {
  id: string;
  reporterUserId: string;
  reporterName?: string;
  reportedUserId: string;
  reportedName?: string;
  roomId?: string;
  messageId?: string;
  reason: string;
  evidence?: { messageText?: string; createdAt?: string };
  createdAt: string | Date;
};

export default function AdminChatReports() {
  const [reports, setReports] = useState<ChatReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setReports([]);
        return;
      }

      const res = await fetch("/api/admin/chat/reports", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json?.success) {
        setReports([]);
        return;
      }

      setReports((json.data?.reports || []) as ChatReport[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    return [...reports].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [reports]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Rapoarte Chat</h3>
          <div className="text-sm text-gray-400">Total: {reports.length}</div>
        </div>
        <button
          onClick={() => void fetchReports()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition"
        >
          Reîncarcă
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Se încarcă...</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nu există rapoarte.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Când</th>
                  <th className="px-4 py-3 text-left font-semibold">Reporter</th>
                  <th className="px-4 py-3 text-left font-semibold">Raportat</th>
                  <th className="px-4 py-3 text-left font-semibold">Motiv</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalii</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800 transition">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("ro-RO")}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${encodeURIComponent(r.reporterUserId)}`}
                        className="text-gray-200 hover:text-white underline"
                      >
                        {r.reporterName || r.reporterUserId}
                      </Link>
                      <div className="text-xs text-gray-500">{r.reporterUserId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${encodeURIComponent(r.reportedUserId)}`}
                        className="text-gray-200 hover:text-white underline"
                      >
                        {r.reportedName || r.reportedUserId}
                      </Link>
                      <div className="text-xs text-gray-500">{r.reportedUserId}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-md truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {r.evidence?.messageText ? (
                        <div className="max-w-md truncate">{r.evidence.messageText}</div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                      <div className="text-xs text-gray-500">room: {r.roomId || "—"}</div>
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
