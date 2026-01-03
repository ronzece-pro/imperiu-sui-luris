"use client";

import React, { useEffect, useState, useCallback } from "react";

interface HelpPost {
  id: string;
  title: string;
  status: string;
  urgency: string;
  isActive: boolean;
  createdAt: string;
  author: { id: string; fullName: string; username: string };
  category: { name: string; icon: string };
  _count: { comments: number; offers: number; likes: number };
}

interface HelpReport {
  id: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  reporter: { id: string; fullName: string };
  post?: { id: string; title: string };
  comment?: { id: string; text: string };
  offer?: { id: string };
}

interface HelpOffer {
  id: string;
  status: string;
  createdAt: string;
  post: { id: string; title: string };
  helper: { id: string; fullName: string };
  requester: { id: string; fullName: string };
}

export default function HelpModerationAdmin() {
  const [activeTab, setActiveTab] = useState<"posts" | "reports" | "offers" | "withdrawals">("posts");
  const [posts, setPosts] = useState<HelpPost[]>([]);
  const [reports, setReports] = useState<HelpReport[]>([]);
  const [offers, setOffers] = useState<HelpOffer[]>([]);
  const [withdrawals, setWithdrawals] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchPosts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/help/posts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.data.posts);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchReports = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/help/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }, []);

  const fetchOffers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/help/offers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setOffers(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/help/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "posts") fetchPosts();
    if (activeTab === "reports") fetchReports();
    if (activeTab === "offers") fetchOffers();
    if (activeTab === "withdrawals") fetchWithdrawals();
  }, [activeTab, fetchPosts, fetchReports, fetchOffers, fetchWithdrawals]);

  const handleTogglePostActive = async (post: HelpPost) => {
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/help/posts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: post.id, isActive: !post.isActive }),
      });
      fetchPosts();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeletePost = async (post: HelpPost) => {
    if (!confirm(`Sigur vrei să ștergi postarea "${post.title}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/help/posts?id=${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPosts();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const tabs = [
    { id: "posts", label: "Postări", count: posts.length },
    { id: "reports", label: "Rapoarte", count: reports.filter((r) => r.status === "pending").length },
    { id: "offers", label: "Oferte Active", count: offers.filter((o) => o.status === "accepted").length },
    { id: "withdrawals", label: "Retrageri", count: withdrawals.length },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "bg-amber-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            >
              <option value="">Toate statusurile</option>
              <option value="open">Deschise</option>
              <option value="in_progress">În progres</option>
              <option value="completed">Completate</option>
              <option value="closed">Închise</option>
            </select>
          </div>

          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Postare</th>
                  <th className="px-4 py-3 text-left">Autor</th>
                  <th className="px-4 py-3 text-center">Statistici</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Se încarcă...
                    </td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Nu sunt postări
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{post.category.icon}</span>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {post.title}
                              {post.urgency === "urgent" && (
                                <span className="text-red-400 text-sm">🔴</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {new Date(post.createdAt).toLocaleDateString("ro-RO")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{post.author.fullName}</div>
                          <div className="text-sm text-gray-400">@{post.author.username}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
                          <span title="Like-uri">❤️ {post._count.likes}</span>
                          <span title="Comentarii">💬 {post._count.comments}</span>
                          <span title="Oferte">🤝 {post._count.offers}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              post.status === "open"
                                ? "bg-green-500/20 text-green-400"
                                : post.status === "in_progress"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : post.status === "completed"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {post.status}
                          </span>
                          <br />
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              post.isActive
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {post.isActive ? "Vizibilă" : "Ascunsă"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={`/help/post/${post.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                            title="Vezi"
                          >
                            👁
                          </a>
                          <button
                            onClick={() => handleTogglePostActive(post)}
                            className={post.isActive ? "text-yellow-400" : "text-green-400"}
                            title={post.isActive ? "Ascunde" : "Afișează"}
                          >
                            {post.isActive ? "🙈" : "👁"}
                          </button>
                          <button
                            onClick={() => handleDeletePost(post)}
                            className="text-red-400 hover:text-red-300"
                            title="Șterge"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Rapoarte ({reports.length})</h3>
          {reports.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nu sunt rapoarte</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`bg-gray-700/50 rounded-lg p-4 ${
                    report.status === "pending" ? "border-l-4 border-amber-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            report.reason === "scam"
                              ? "bg-red-500/20 text-red-400"
                              : report.reason === "spam"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {report.reason}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            report.status === "pending"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        Raportat de: {report.reporter.fullName} •{" "}
                        {new Date(report.createdAt).toLocaleDateString("ro-RO")}
                      </div>
                      {report.post && (
                        <div className="text-sm">
                          Postare: <strong>{report.post.title}</strong>
                        </div>
                      )}
                      {report.comment && (
                        <div className="text-sm">
                          Comentariu: <em>"{report.comment.text.substring(0, 100)}..."</em>
                        </div>
                      )}
                      {report.description && (
                        <div className="text-sm text-gray-300 mt-2">
                          Detalii: {report.description}
                        </div>
                      )}
                    </div>
                    {report.status === "pending" && (
                      <div className="flex gap-2">
                        <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm">
                          ✓ Rezolvat
                        </button>
                        <button className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm">
                          ✗ Respinge
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offers Tab */}
      {activeTab === "offers" && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Oferte de Ajutor ({offers.length})</h3>
          {offers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nu sunt oferte active</p>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div key={offer.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium mb-1">{offer.post.title}</div>
                      <div className="text-sm text-gray-400">
                        Helper: {offer.helper.fullName} → Requester: {offer.requester.fullName}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(offer.createdAt).toLocaleDateString("ro-RO")}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        offer.status === "accepted"
                          ? "bg-green-500/20 text-green-400"
                          : offer.status === "confirmed"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {offer.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === "withdrawals" && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Cereri de Retragere ({withdrawals.length})</h3>
          {withdrawals.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nu sunt cereri de retragere</p>
          ) : (
            <div className="space-y-4">
              {(withdrawals as Record<string, unknown>[]).map((w, i) => (
                <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                  <pre className="text-sm text-gray-300">{JSON.stringify(w, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
