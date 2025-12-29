"use client";

import { useEffect, useMemo, useState } from "react";

type VerificationStatus = "pending" | "approved" | "rejected" | "resubmit_required";

type AdminVerificationRequest = {
  id: string;
  userId: string;
  legalFullName?: string;
  country?: string;
  birthDate?: string;
  city?: string;
  address?: string;
  docKind: "bulletin" | "passport" | "driver_license";
  status: VerificationStatus;
  adminNote?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  decidedAt?: string | Date;
  user?: { id: string; fullName: string; email: string } | null;
  uploads: Array<{
    id: string;
    kind: "document" | "selfie";
    fileName: string;
    mimeType: string;
    size: number;
    dataUrl: string;
  }>;
};

function statusChip(status: VerificationStatus) {
  if (status === "pending") return "bg-yellow-900 text-yellow-200 border-yellow-800";
  if (status === "approved") return "bg-green-900 text-green-200 border-green-800";
  if (status === "rejected") return "bg-red-900 text-red-200 border-red-800";
  return "bg-purple-900 text-purple-200 border-purple-800";
}

export default function AdminVerificationRequests() {
  const [requests, setRequests] = useState<AdminVerificationRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [lightbox, setLightbox] = useState<{ src: string; title: string; downloadName: string } | null>(null);
  const [activeTab, setActiveTab] = useState<VerificationStatus>("pending");

  const pending = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const approved = useMemo(() => requests.filter((r) => r.status === "approved"), [requests]);
  const rejected = useMemo(() => requests.filter((r) => r.status === "rejected"), [requests]);
  const resend = useMemo(() => requests.filter((r) => r.status === "resubmit_required"), [requests]);

  const activeList = useMemo(() => {
    if (activeTab === "approved") return approved;
    if (activeTab === "rejected") return rejected;
    if (activeTab === "resubmit_required") return resend;
    return pending;
  }, [activeTab, approved, rejected, resend, pending]);

  const tabButton = (tab: VerificationStatus, label: string, count: number) => {
    const active = tab === activeTab;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={
          "px-3 py-1.5 rounded-lg text-xs border transition " +
          (active
            ? "bg-white/10 border-white/15 text-white"
            : "bg-transparent border-gray-800 text-gray-300 hover:bg-white/5 hover:text-white")
        }
      >
        {label} <span className="text-gray-400">({count})</span>
      </button>
    );
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setRequests([]);
        setPendingCount(0);
        return;
      }

      const res = await fetch("/api/admin/verification?limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json?.success) {
        setRequests([]);
        setPendingCount(0);
        return;
      }

      setRequests((json.data?.requests || []) as AdminVerificationRequest[]);
      setPendingCount(Number(json.data?.pendingCount || 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
     
  }, []);

  const decide = async (id: string, status: Exclude<VerificationStatus, "pending">) => {
    try {
      setBusyId(id);
      setMessage("");
      const token = localStorage.getItem("token");
      if (!token) {
        setMessageKind("error");
        setMessage("Trebuie să fii logat ca admin");
        return;
      }

      const adminNote = status === "approved" ? "" : window.prompt("Notă pentru utilizator (opțional):") || "";

      const res = await fetch("/api/admin/verification", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: id, status, adminNote }),
      });
      const json = await res.json();
      if (!json?.success) {
        setMessageKind("error");
        setMessage(json?.error || json?.message || "Eroare");
        return;
      }

      const updated = json.data?.request as AdminVerificationRequest;
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      setMessageKind("success");
      setMessage("Actualizat");
      setTimeout(() => setMessage(""), 2000);
      await fetchAll();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {lightbox ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="button"
          aria-label="Închide imagine"
        >
          <div
            className="max-w-5xl w-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="text-sm text-gray-200 truncate">{lightbox.title}</div>
              <div className="flex items-center gap-3">
                <a
                  href={lightbox.src}
                  download={lightbox.downloadName}
                  className="text-sm text-gray-200 hover:text-white"
                >
                  Descarcă
                </a>
                <button className="text-sm text-gray-200 hover:text-white" onClick={() => setLightbox(null)}>
                  Închide
                </button>
              </div>
            </div>
            <div className="p-3">
              <div className="w-full max-h-[78vh] overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightbox.src}
                  alt={lightbox.title}
                  className="w-full h-auto max-h-[78vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Cereri verificare</h3>
          <div className="text-sm text-gray-400">În așteptare: {pendingCount}</div>
        </div>
        <button
          onClick={() => void fetchAll()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition"
        >
          Reîncarcă
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabButton("pending", "În așteptare", pending.length)}
        {tabButton("approved", "Aprobate", approved.length)}
        {tabButton("rejected", "Respinse", rejected.length)}
        {tabButton("resubmit_required", "Resend", resend.length)}
      </div>

      {message && (
        <div
          className={`px-4 py-3 text-sm border border-gray-800 rounded-lg ${
            messageKind === "success" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Se încarcă...</div>
        ) : activeList.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nu există cereri în acest tab.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Când</th>
                  <th className="px-4 py-3 text-left font-semibold">Utilizator</th>
                  <th className="px-4 py-3 text-left font-semibold">Identitate</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Preview</th>
                  <th className="px-4 py-3 text-left font-semibold">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {activeList.map((r) => {
                  const selfie = r.uploads.find((u) => u.kind === "selfie");
                  const doc = r.uploads.find((u) => u.kind === "document" && u.mimeType.startsWith("image/"));
                  const canDecide = r.status === "pending";

                  return (
                    <tr key={r.id} className="hover:bg-gray-800 transition">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("ro-RO")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.user?.fullName || r.userId}</div>
                        <div className="text-xs text-gray-400">{r.user?.email || ""}</div>
                        <div className="text-xs text-gray-500">{r.docKind}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-100">{r.legalFullName || "—"}</div>
                        <div className="text-xs text-gray-400">
                          {(r.birthDate || "—") + " • " + ((r.city || "—") + ", " + (r.country || "—"))}
                        </div>
                        <div className="text-xs text-gray-500">{r.address || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs border ${statusChip(r.status)}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center">
                          {selfie?.mimeType?.startsWith("image/") ? (
                            <button
                              type="button"
                              className="w-10 h-10 rounded border border-gray-700 overflow-hidden"
                              onClick={() =>
                                setLightbox({
                                  src: selfie.dataUrl,
                                  title: `Selfie (${r.user?.fullName || r.userId})`,
                                  downloadName: `selfie_${r.userId}_${r.id}.jpg`,
                                })
                              }
                              title="Selfie"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={selfie.dataUrl}
                                alt="selfie"
                                className="w-10 h-10 object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded border border-gray-700 bg-black/30" />
                          )}
                          {doc?.mimeType?.startsWith("image/") ? (
                            <button
                              type="button"
                              className="w-10 h-10 rounded border border-gray-700 overflow-hidden"
                              onClick={() =>
                                setLightbox({
                                  src: doc.dataUrl,
                                  title: `Document (${r.user?.fullName || r.userId})`,
                                  downloadName: `document_${r.userId}_${r.id}.jpg`,
                                })
                              }
                              title="Document"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={doc.dataUrl} alt="doc" className="w-10 h-10 object-cover" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded border border-gray-700 bg-black/30" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => void decide(r.id, "approved")}
                            disabled={busyId === r.id || !canDecide}
                            className="px-3 py-1 rounded-lg text-xs bg-green-600 hover:bg-green-700 disabled:opacity-60"
                          >
                            Aprobă
                          </button>
                          <button
                            onClick={() => void decide(r.id, "resubmit_required")}
                            disabled={busyId === r.id || !canDecide}
                            className="px-3 py-1 rounded-lg text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-60"
                          >
                            Resend docs
                          </button>
                          <button
                            onClick={() => void decide(r.id, "rejected")}
                            disabled={busyId === r.id || !canDecide}
                            className="px-3 py-1 rounded-lg text-xs bg-red-600 hover:bg-red-700 disabled:opacity-60"
                          >
                            Respinge
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && requests.length > pending.length ? (
        <div className="text-xs text-gray-500">
          Total cereri (inclusiv decise): {requests.length}
        </div>
      ) : null}
    </div>
  );
}
