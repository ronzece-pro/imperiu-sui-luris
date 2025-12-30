"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import {
  decryptPrivateMessage,
  encryptPrivateMessage,
  createAndStoreIdentityKeyPair,
  loadIdentityKeyPairIfExists,
} from "@/lib/chat/e2eClient";

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
  encrypted?: {
    v: 1;
    algorithm: "AES-GCM";
    iv: string;
    ciphertext: string;
  };
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
  const [me, setMe] = useState<{ id: string; isVerified: boolean; verifiedUntil?: string } | null>(null);

  const [mobilePane, setMobilePane] = useState<"users" | "chat">("users");

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  const [privateBlocked, setPrivateBlocked] = useState(false);

  const [privateUnreadByUserId, setPrivateUnreadByUserId] = useState<Record<string, number>>({});
  const [privateTotalUnread, setPrivateTotalUnread] = useState(0);

  const [e2e, setE2e] = useState<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey } | null>(null);
  const [otherPublicJwk, setOtherPublicJwk] = useState<JsonWebKey | null>(null);
  const [decryptedByMessageId, setDecryptedByMessageId] = useState<Record<string, { text: string; attachments?: ChatAttachment[] }>>(
    {}
  );

  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isPrivate = Boolean(selectedUserId);
  const canUseGlobal = Boolean(me?.isVerified);

  const e2eReady = Boolean(isPrivate && e2e && otherPublicJwk);

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
          setMe({ 
            id: json.data?.user?.id, 
            isVerified: Boolean(json.data?.user?.isVerified),
            verifiedUntil: json.data?.user?.verifiedUntil
          });
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
    if (!token || !me?.id) return;
    let cancelled = false;

    const ensureKeys = async () => {
      try {
        // IMPORTANT: don't auto-generate/publish keys (incognito would overwrite server key).
        const kp = await loadIdentityKeyPairIfExists();
        if (!kp) return;
        if (cancelled) return;
        setE2e({ publicJwk: kp.publicJwk, privateJwk: kp.privateJwk });

        await fetch("/api/chat/keys", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ algorithm: "ECDH-P256", publicKeyJwk: kp.publicJwk }),
        });
      } catch {
        // ignore (E2E will be unavailable)
      }
    };

    void ensureKeys();
    return () => {
      cancelled = true;
    };
  }, [token, me?.id]);

  const publishE2EPublicKey = async (publicJwk: JsonWebKey) => {
    await fetch("/api/chat/keys", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ algorithm: "ECDH-P256", publicKeyJwk: publicJwk }),
    });
  };

  const activateE2EOnThisDevice = async () => {
    if (!token || !me?.id) return;
    const ok = window.confirm(
      "Activezi E2E pe acest device? În mod incognito, cheile se pierd la închidere și poate afecta decriptarea în alte sesiuni."
    );
    if (!ok) return;

    try {
      if (e2e?.publicJwk) {
        await publishE2EPublicKey(e2e.publicJwk);
        return;
      }

      const kp = await createAndStoreIdentityKeyPair();
      setE2e({ publicJwk: kp.publicJwk, privateJwk: kp.privateJwk });
      await publishE2EPublicKey(kp.publicJwk);
    } catch {
      setError("Nu am putut activa E2E pe acest device");
    }
  };

  useEffect(() => {
    if (!token || !me?.id) return;
    if (!selectedUserId) {
      setOtherPublicJwk(null);
      return;
    }

    let cancelled = false;
    const loadOtherKey = async () => {
      try {
        const res = await fetch(`/api/chat/keys?userId=${encodeURIComponent(selectedUserId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok || !json?.success) return;
        if (cancelled) return;
        setOtherPublicJwk((json.data?.publicKeyJwk as JsonWebKey) || null);
      } catch {
        if (!cancelled) setOtherPublicJwk(null);
      }
    };

    void loadOtherKey();
    return () => {
      cancelled = true;
    };
  }, [selectedUserId, token, me?.id]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/chat/notifications", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!res.ok || !json?.success) return;
        if (cancelled) return;
        const unreadByUserId = (json.data?.unreadByUserId || {}) as Record<string, number>;
        const totalUnread = Number(json.data?.totalUnread || 0);
        setPrivateUnreadByUserId(unreadByUserId);
        setPrivateTotalUnread(totalUnread);
      } catch {
        // ignore
      }
    };

    void load();
    const intervalId = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    let inFlight = false;

    const load = async (silent: boolean) => {
      if (inFlight) return;
      inFlight = true;
      if (silent) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
        setError("");
      }
      try {
        const url = selectedUserId
          ? `/api/chat/private?withUserId=${encodeURIComponent(selectedUserId)}`
          : "/api/chat/global";

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();

        if (!res.ok || !json?.success) {
          if (!cancelled && !silent) {
            setRoom(null);
            setMessages([]);
            setError(json?.message || json?.error || "Nu s-a putut încărca chat-ul");
          }
          return;
        }

        if (!cancelled) {
          setRoom(json.data?.room || null);
          setMessages((json.data?.messages || []) as ChatMessage[]);

          if (selectedUserId) {
            setPrivateBlocked(Boolean(json.data?.blocked));
          } else {
            setPrivateBlocked(false);
          }
        }
      } catch {
        if (!cancelled && !silent) setError("Eroare de rețea");
      } finally {
        inFlight = false;
        if (!cancelled) {
          if (silent) setRefreshing(false);
          else setInitialLoading(false);
        }
      }
    };

    void load(false);
    const intervalId = setInterval(() => void load(true), 2500);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [selectedUserId, token]);

  useEffect(() => {
    if (mobilePane !== "chat") return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedUserId, mobilePane]);

  const openPrivate = (userId: string) => {
    setSelectedUserId(userId);
    setMobilePane("chat");
    router.push(`/chat?withUserId=${encodeURIComponent(userId)}`);

    // optimistic: clear unread badge for that user (server will also mark read on GET)
    setPrivateUnreadByUserId((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const openGlobal = () => {
    setSelectedUserId(null);
    setMobilePane("chat");
    router.push("/chat");
  };

  const openFirstUnread = () => {
    const entries = Object.entries(privateUnreadByUserId).sort((a, b) => b[1] - a[1]);
    const first = entries[0]?.[0];
    if (first) openPrivate(first);
    else router.push("/chat");
  };

  const onPickFiles = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(evt.target.files || []);
    setFiles(list.slice(0, 3));
  };

  const send = async () => {
    if (!token) return;
    if (!text.trim() && files.length === 0) return;
    if (!isPrivate && !canUseGlobal) return;
    if (isPrivate && privateBlocked) return;

    setSending(true);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      const plainPayload = {
        text,
        attachments: attachments.map((a, i) => ({
          id: `att_${Date.now()}_${i}`,
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
          dataUrl: a.dataUrl,
        })),
      };

      const payload = isPrivate
        ? e2e && otherPublicJwk && me?.id && selectedUserId
          ? {
              encrypted: await encryptPrivateMessage({
                myPrivateJwk: e2e.privateJwk,
                otherPublicJwk,
                myUserId: me.id,
                otherUserId: selectedUserId,
                payload: plainPayload,
              }),
            }
          : plainPayload
        : plainPayload;

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

  useEffect(() => {
    if (!isPrivate) {
      setDecryptedByMessageId({});
      return;
    }
    if (!e2e || !otherPublicJwk || !me?.id || !selectedUserId) return;

    let cancelled = false;
    const decryptAll = async () => {
      const toDecrypt = messages.filter((m) => m.roomType === "private" && m.encrypted && !decryptedByMessageId[m.id]);
      if (toDecrypt.length === 0) return;

      const next: Record<string, { text: string; attachments?: ChatAttachment[] }> = {};
      for (const m of toDecrypt) {
        try {
          const payload = await decryptPrivateMessage({
            myPrivateJwk: e2e.privateJwk,
            otherPublicJwk,
            myUserId: me.id,
            otherUserId: selectedUserId,
            encrypted: m.encrypted!,
          });
          next[m.id] = {
            text: typeof payload?.text === "string" ? payload.text : "",
            attachments: Array.isArray(payload?.attachments) ? (payload.attachments as ChatAttachment[]) : undefined,
          };
        } catch {
          next[m.id] = { text: "[Mesaj criptat – nu poate fi decriptat pe acest device]" };
        }
      }
      if (!cancelled) {
        setDecryptedByMessageId((prev) => ({ ...prev, ...next }));
      }
    };

    void decryptAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isPrivate, e2e, otherPublicJwk, me?.id, selectedUserId]);

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

  const toggleBlock = async () => {
    if (!token || !selectedUserId) return;
    try {
      const res = await fetch("/api/chat/block", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ withUserId: selectedUserId, blocked: !privateBlocked }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message || json?.error || "Nu s-a putut schimba statusul de blocare");
        return;
      }
      setPrivateBlocked(Boolean(json.data?.blocked));
    } catch {
      setError("Eroare de rețea");
    }
  };

  const reportUser = async (opts?: { messageId?: string; evidenceText?: string; evidenceCreatedAt?: string }) => {
    if (!token || !selectedUserId) return;
    const reason = (window.prompt("Motiv raportare (spam / înșelăciune / abuz):") || "").trim();
    if (!reason) return;

    try {
      const res = await fetch("/api/chat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          withUserId: selectedUserId,
          reason,
          messageId: opts?.messageId,
          evidence: opts?.evidenceText
            ? { messageText: opts.evidenceText, createdAt: opts.evidenceCreatedAt }
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message || json?.error || "Nu s-a putut trimite raportul");
        return;
      }
      alert("Raport trimis. Mulțumim!");
    } catch {
      setError("Eroare de rețea");
    }
  };

  const deleteOwnGlobalMessage = async (messageId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/global?messageId=${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
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
            <div className="hidden lg:block lg:w-80 bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
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

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-400">Mesaje private</div>
                <button
                  onClick={openFirstUnread}
                  className="relative px-2 py-1 rounded border bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
                  title="Notificări"
                >
                  <span className="text-sm">🔔</span>
                  {privateTotalUnread > 0 && (
                    <span className="absolute -top-2 -right-2 text-[10px] leading-none px-1.5 py-1 rounded-full bg-red-600 text-white">
                      {privateTotalUnread}
                    </span>
                  )}
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
                      <div className="flex items-center gap-2">
                        {privateUnreadByUserId[u.id] ? (
                          <span className="text-[10px] leading-none px-2 py-1 rounded-full bg-red-600 text-white">
                            {privateUnreadByUserId[u.id]}
                          </span>
                        ) : null}
                        <div className="text-xs text-gray-300">{u.isVerified ? "verificat" : "ne-verificat"}</div>
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
                  {isPrivate ? (
                    <div className="text-xs text-gray-400">
                      {e2eReady
                        ? "Criptat end-to-end (E2E)"
                        : !e2e
                          ? "E2E indisponibil pe acest device"
                          : "E2E în așteptare (lipsește cheia celuilalt)"}
                      {!e2eReady && (
                        <button
                          onClick={() => void activateE2EOnThisDevice()}
                          className="ml-2 text-xs px-2 py-0.5 rounded border bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
                        >
                          {e2e ? "Re-publică cheia E2E" : "Activează E2E"}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="lg:hidden flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobilePane("chat")}
                    className={`text-xs px-3 py-1 rounded border ${
                      mobilePane === "chat"
                        ? "bg-blue-600 border-blue-700 text-white"
                        : "bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePane("users")}
                    className={`text-xs px-3 py-1 rounded border ${
                      mobilePane === "users"
                        ? "bg-blue-600 border-blue-700 text-white"
                        : "bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    Utilizatori
                  </button>
                </div>

                {isPrivate && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void reportUser()}
                      className="text-xs px-3 py-1 rounded border bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
                    >
                      Raportează
                    </button>
                    <button
                      onClick={() => void toggleBlock()}
                      className={`text-xs px-3 py-1 rounded border ${
                        privateBlocked
                          ? "bg-red-600/20 border-red-700 text-red-200 hover:bg-red-600/30"
                          : "bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
                      }`}
                    >
                      {privateBlocked ? "Deblochează" : "Blochează"}
                    </button>
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

              <div className={`lg:hidden ${mobilePane === "users" ? "block" : "hidden"}`}>
                <div className="p-4 space-y-3 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-bold">Mesaje</div>
                    <button
                      onClick={openGlobal}
                      className={`text-xs px-3 py-1 rounded border ${
                        isPrivate ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700" : "bg-blue-600 border-blue-700 text-white"
                      }`}
                    >
                      Global
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">Mesaje private</div>
                    <button
                      onClick={openFirstUnread}
                      className="relative px-2 py-1 rounded border bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
                      title="Notificări"
                    >
                      <span className="text-sm">🔔</span>
                      {privateTotalUnread > 0 && (
                        <span className="absolute -top-2 -right-2 text-[10px] leading-none px-1.5 py-1 rounded-full bg-red-600 text-white">
                          {privateTotalUnread}
                        </span>
                      )}
                    </button>
                  </div>

                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Caută utilizator..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                  />

                  <div className="space-y-2 max-h-[55vh] overflow-auto">
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
                          <div className="flex items-center gap-2">
                            {privateUnreadByUserId[u.id] ? (
                              <span className="text-[10px] leading-none px-2 py-1 rounded-full bg-red-600 text-white">
                                {privateUnreadByUserId[u.id]}
                              </span>
                            ) : null}
                            <div className="text-xs text-gray-300">{u.isVerified ? "verificat" : "ne-verificat"}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`${mobilePane === "users" ? "hidden" : "block"} lg:block p-4 space-y-3 max-h-[60vh] overflow-auto select-none`}
                onContextMenu={(e) => e.preventDefault()}
              >
                {error ? (
                  <div className="text-red-400">{error}</div>
                ) : (
                  messages.map((m) => {
                    const mine = me?.id && m.senderId === me.id;
                    const decrypted = isPrivate ? decryptedByMessageId[m.id] : null;
                    const displayText = decrypted ? decrypted.text : m.text;
                    const displayAttachments = decrypted?.attachments ?? m.attachments;
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
                          {displayText && <div className="text-sm text-gray-100 mt-1 whitespace-pre-wrap">{displayText}</div>}

                          {displayAttachments && displayAttachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {displayAttachments.map((a) => (
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

                          {((isPrivate && mine) || (!isPrivate && mine)) && (
                            <div className="mt-2">
                              <button
                                onClick={() =>
                                  void (isPrivate ? deleteOwnPrivateMessage(m.id) : deleteOwnGlobalMessage(m.id))
                                }
                                className="text-xs text-red-300 hover:text-red-200"
                              >
                                Șterge mesajul
                              </button>
                            </div>
                          )}

                          {isPrivate && !mine && (
                            <div className="mt-2">
                              <button
                                onClick={() =>
                                  void reportUser({
                                    messageId: m.id,
                                    evidenceText: displayText,
                                    evidenceCreatedAt: m.createdAt,
                                  })
                                }
                                className="text-xs text-yellow-300 hover:text-yellow-200"
                              >
                                Raportează mesajul
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {initialLoading && messages.length === 0 ? (
                  <div className="text-gray-400">Se încarcă...</div>
                ) : null}
                <div ref={bottomRef} />
              </div>

              <div className={`${mobilePane === "users" ? "hidden" : "block"} lg:block p-4 border-t border-slate-700`}>
                {isPrivate && privateBlocked && (
                  <div className="mb-3 text-sm text-red-200">
                    Chat blocat. Nu poți trimite mesaje către acest utilizator.
                  </div>
                )}
                {!isPrivate && me?.verifiedUntil && (
                  <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-200">
                    ⏳ <strong>Verificare temporară</strong> - Accesul la chat expiră pe{" "}
                    {new Date(me.verifiedUntil).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </div>
                )}
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
                    disabled={(!isPrivate && !canUseGlobal) || (isPrivate && privateBlocked)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 disabled:opacity-60"
                  />
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,text/plain"
                    onChange={onPickFiles}
                    disabled={(!isPrivate && !canUseGlobal) || (isPrivate && privateBlocked) || sending}
                    className="text-sm text-gray-300"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={
                      sending ||
                      (!text.trim() && files.length === 0) ||
                      (!isPrivate && !canUseGlobal) ||
                      (isPrivate && privateBlocked)
                    }
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
