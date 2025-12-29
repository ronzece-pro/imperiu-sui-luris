"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

type ChatUser = {
  id: string;
  name: string;
  badge?: string;
  role?: string;
  isVerified: boolean;
};

type ChatAttachment = {
  id: string;
  kind: "image" | "pdf" | "text";
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

type ChatMessage = {
  id: string;
  roomId: string;
  roomType: "global" | "private";
  senderId: string;
  text: string;
  attachments?: ChatAttachment[];
  createdAt: string;
  sender?: ChatUser;
};

type ChatRoom = {
  id: string;
  type: "global" | "private";
  autoDeleteSeconds?: number;
};

async function fileToAttachment(file: File): Promise<Omit<ChatAttachment, "id" | "kind">> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read error"));
    r.readAsDataURL(file);
  });

  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
  };
}

export default function ChatPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [me, setMe] = useState<{ id: string; isVerified: boolean } | null>(null);

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isPrivate = Boolean(selectedUserId);
  const canUseGlobal = Boolean(me?.isVerified);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const list = users.filter((u) => !q || u.name.toLowerCase().includes(q));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [userQuery, users]);

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    if (!t) {
      router.push("/auth/login");
      return;
    }
    setToken(t);

    // initial selected user from URL
    try {
      const params = new URLSearchParams(window.location.search);
      const withUserId = (params.get("withUserId") || "").trim();
      if (withUserId) setSelectedUserId(withUserId);
    } catch {
      // ignore
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const fetchMe = async () => {
      try {
        const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json?.success) {
          setMe({ id: json.data?.user?.id, isVerified: Boolean(json.data?.user?.isVerified) });
        }
      } catch {
        // ignore
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/chat/users", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json?.success) {
          setUsers(json.data as ChatUser[]);
        }
      } catch {
        setUsers([]);
      }
    };

    void fetchMe();
    void fetchUsers();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let timer: any;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const url = selectedUserId
          ? `/api/chat/private?withUserId=${encodeURIComponent(selectedUserId)}`
          : "/api/chat/global";

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();

        if (!res.ok || !json?.success) {
          if (!cancelled) {
            setRoom(null);
            setMessages([]);
            setError(json?.message || json?.error || "Nu s-a putut încărca chat-ul");
          }
          return;
        }

        if (!cancelled) {
          setRoom(json.data?.room || null);
          setMessages((json.data?.messages || []) as ChatMessage[]);
        }
      } catch {
        if (!cancelled) setError("Eroare de rețea");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const poll = async () => {
      await load();
      timer = setInterval(load, 2500);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [selectedUserId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedUserId]);

  const openPrivate = (userId: string) => {
    setSelectedUserId(userId);
    router.push(`/chat?withUserId=${encodeURIComponent(userId)}`);
  };

  const openGlobal = () => {
    setSelectedUserId(null);
    router.push("/chat");
  };

  const onPickFiles = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(evt.target.files || []);
    setFiles(list.slice(0, 3));
  };

  const send = async () => {
    if (!token) return;
    if (!text.trim() && files.length === 0) return;
    if (!isPrivate && !canUseGlobal) return;

    setSending(true);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      const payload = {
        text,
        attachments: attachments.map((a, i) => ({
          id: `att_${Date.now()}_${i}`,
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
          dataUrl: a.dataUrl,
        })),
      };

      const url = selectedUserId
        ? `/api/chat/private?withUserId=${encodeURIComponent(selectedUserId)}`
        : "/api/chat/global";

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message || json?.error || "Nu s-a putut trimite mesajul");
        return;
      }

      setText("");
      setFiles([]);
    } catch {
      setError("Eroare de rețea");
    } finally {
      setSending(false);
    }
  };

  const deleteOwnPrivateMessage = async (messageId: string) => {
    if (!token || !selectedUserId) return;
    try {
      const res = await fetch(
        `/api/chat/private?withUserId=${encodeURIComponent(selectedUserId)}&messageId=${encodeURIComponent(messageId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message || json?.error || "Nu s-a putut șterge mesajul");
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      setError("Eroare de rețea");
    }
  };

  const setTimer = async (autoDeleteSeconds: number | null) => {
    if (!token || !selectedUserId) return;
    try {
      const res = await fetch("/api/chat/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ withUserId: selectedUserId, autoDeleteSeconds }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message || json?.error || "Nu s-a putut salva timer-ul");
        return;
      }
      setRoom(json.data?.room || null);
    } catch {
      setError("Eroare de rețea");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-80 bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold">Chat</h2>
                <button
                  onClick={openGlobal}
                  className={`text-xs px-3 py-1 rounded border ${
                    isPrivate ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700" : "bg-blue-600 border-blue-700 text-white"
                  }`}
                >
                  Global
                </button>
              </div>

              <div className="mt-3">
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Caută utilizator..."
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                />
              </div>

              <div className="mt-3 space-y-2 max-h-[60vh] overflow-auto">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openPrivate(u.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                      selectedUserId === u.id
                        ? "bg-blue-600/30 border-blue-700 text-white"
                        : "bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{u.name}</div>
                      <div className="text-xs text-gray-300">
                        {u.isVerified ? "verificat" : "ne-verificat"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main */}
            <div className="flex-1 bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <div className="text-white font-bold">
                    {isPrivate ? "Chat privat" : "Chat global"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {isPrivate ? "Mesajele se șterg implicit după 72h" : "Mesajele se șterg automat după 24h"}
                  </div>
                </div>

                {isPrivate && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-400">Timer:</div>
                    <select
                      value={room?.autoDeleteSeconds ?? 0}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        void setTimer(v === 0 ? null : v);
                      }}
                      className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value={0}>implicit (72h)</option>
                      <option value={3600}>1 oră</option>
                      <option value={86400}>24 ore</option>
                      <option value={259200}>72 ore</option>
                      <option value={604800}>7 zile</option>
                    </select>
                  </div>
                )}
              </div>

              <div
                className="p-4 space-y-3 max-h-[60vh] overflow-auto select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                {loading ? (
                  <div className="text-gray-400">Se încarcă...</div>
                ) : error ? (
                  <div className="text-red-400">{error}</div>
                ) : (
                  messages.map((m) => {
                    const mine = me?.id && m.senderId === me.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg border px-3 py-2 ${mine ? "bg-blue-600/25 border-blue-700" : "bg-black/20 border-white/10"}`}>
                          <div className="text-xs text-gray-400 flex items-center justify-between gap-3">
                            <span className="truncate">
                              {m.sender?.name || m.senderId}
                              {m.sender?.isVerified ? " · verificat" : ""}
                            </span>
                            <span className="whitespace-nowrap">{new Date(m.createdAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          {m.text && <div className="text-sm text-gray-100 mt-1 whitespace-pre-wrap">{m.text}</div>}

                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {m.attachments.map((a) => (
                                <div key={a.id} className="text-sm">
                                  {a.kind === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={a.dataUrl} alt={a.name} className="max-h-56 rounded border border-white/10" />
                                  ) : (
                                    <a
                                      href={a.dataUrl}
                                      download={a.name}
                                      className="text-blue-300 hover:text-blue-200 underline"
                                    >
                                      {a.name}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {isPrivate && mine && (
                            <div className="mt-2">
                              <button
                                onClick={() => void deleteOwnPrivateMessage(m.id)}
                                className="text-xs text-red-300 hover:text-red-200"
                              >
                                Șterge mesajul
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t border-slate-700">
                {!isPrivate && !canUseGlobal && (
                  <div className="mb-3 text-sm text-yellow-300">
                    Contul tău trebuie marcat ca <strong>verificat</strong> de admin ca să folosești chat-ul global.
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={isPrivate ? "Scrie mesaj..." : canUseGlobal ? "Scrie în chat global..." : "Chat global blocat"}
                    disabled={!isPrivate && !canUseGlobal}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 disabled:opacity-60"
                  />
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,text/plain"
                    onChange={onPickFiles}
                    disabled={(!isPrivate && !canUseGlobal) || sending}
                    className="text-sm text-gray-300"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={sending || (!text.trim() && files.length === 0) || (!isPrivate && !canUseGlobal)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold"
                  >
                    {sending ? "Trimite…" : "Trimite"}
                  </button>
                </div>

                {files.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    Atașamente: {files.map((f) => f.name).join(", ")}
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Notă: Nu pot bloca complet screenshot-urile în browser; doar descurajez selecția/click-dreapta.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
