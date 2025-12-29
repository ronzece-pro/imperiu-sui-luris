"use client";

import { useEffect, useState } from "react";

type AdminChatMessage = {
  id: string;
  roomType: "global" | "private";
  roomId: string;
  senderId: string;
  text: string;
  createdAt: string | Date;
  blockedByAdmin?: boolean;
  sender?: { id: string; name: string };
  participants?: Array<{ id: string; name: string }>;
};

export default function AdminChatModeration() {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setMessages([]);
        return;
      }

      const res = await fetch("/api/admin/chat/messages?limit=150", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json?.success) {
        setMessages([]);
        return;
      }

      setMessages((json.data?.messages || []) as AdminChatMessage[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMessages();
     
  }, []);

  const setBlocked = async (id: string, blocked: boolean) => {
    try {
      setBusyId(id);
      setMessage("");
      const token = localStorage.getItem("token");
      if (!token) {
        setMessageKind("error");
        setMessage("Trebuie să fii logat ca admin");
        return;
      }

      const res = await fetch("/api/admin/chat/messages", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId: id, blocked }),
      });
      const json = await res.json();
      if (!json?.success) {
        setMessageKind("error");
        setMessage(json?.error || json?.message || "Eroare");
        return;
      }

      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, blockedByAdmin: blocked } : m)));
      setMessageKind("success");
      setMessage(blocked ? "Mesaj blocat" : "Mesaj deblocat");
      setTimeout(() => setMessage(""), 2500);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    try {
      setBusyId(id);
      setMessage("");
      const token = localStorage.getItem("token");
      if (!token) {
        setMessageKind("error");
        setMessage("Trebuie să fii logat ca admin");
        return;
      }

      const res = await fetch(`/api/admin/chat/messages?messageId=${encodeURIComponent(id)}` , {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json?.success) {
        setMessageKind("error");
        setMessage(json?.error || json?.message || "Eroare");
        return;
      }

      setMessages((prev) => prev.filter((m) => m.id !== id));
      setMessageKind("success");
      setMessage("Mesaj șters");
      setTimeout(() => setMessage(""), 2500);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Moderare Chat</h3>
        <button
          onClick={() => void fetchMessages()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition"
        >
          Reîncarcă
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 text-sm border border-gray-800 rounded-lg ${messageKind === "success" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>
          {message}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Se încarcă...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Când</th>
                  <th className="px-4 py-3 text-left font-semibold">Tip</th>
                  <th className="px-4 py-3 text-left font-semibold">Autor</th>
                  <th className="px-4 py-3 text-left font-semibold">Conținut</th>
                  <th className="px-4 py-3 text-left font-semibold">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-800 transition">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString("ro-RO")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs border ${m.roomType === "global" ? "bg-blue-900 text-blue-200 border-blue-800" : "bg-purple-900 text-purple-200 border-purple-800"}`}>
                        {m.roomType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.sender?.name || m.senderId}</div>
                      {m.roomType === "private" && m.participants && (
                        <div className="text-xs text-gray-500">
                          {m.participants.map((p) => p.name).join(" ↔ ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="max-w-xl truncate">{m.text}</div>
                      {m.blockedByAdmin && <div className="text-xs text-yellow-300 mt-1">blocat</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => void setBlocked(m.id, !m.blockedByAdmin)}
                          disabled={busyId === m.id}
                          className="px-3 py-1 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 disabled:opacity-60"
                        >
                          {m.blockedByAdmin ? "Deblochează" : "Blochează"}
                        </button>
                        <button
                          onClick={() => void remove(m.id)}
                          disabled={busyId === m.id}
                          className="px-3 py-1 rounded-lg text-xs bg-red-600 hover:bg-red-700 disabled:opacity-60"
                        >
                          Șterge
                        </button>
                      </div>
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
