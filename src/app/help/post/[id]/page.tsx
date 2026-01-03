"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface HelpPost {
  id: string;
  title: string;
  description: string;
  images: string[];
  location?: string;
  urgency: string;
  status: string;
  fromLocation?: string;
  toLocation?: string;
  vehicleType?: string;
  seats?: number;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    isVerified: boolean;
    badge?: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  };
  comments: HelpComment[];
  offers: HelpOffer[];
  _count: {
    comments: number;
    likes: number;
    offers: number;
  };
}

interface HelpComment {
  id: string;
  text: string;
  images: string[];
  createdAt: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    isVerified: boolean;
  };
  replies?: HelpComment[];
  _count?: { replies: number };
}

interface HelpOffer {
  id: string;
  status: string;
  chatRoomId?: string;
  createdAt: string;
  helper: {
    id: string;
    username: string;
    fullName: string;
    isVerified: boolean;
  };
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export default function HelpPostPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = params.id as string;
  const shouldOffer = searchParams.get("offer") === "true";

  const [post, setPost] = useState<HelpPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeOffer, setActiveOffer] = useState<HelpOffer | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showOfferModal, setShowOfferModal] = useState(shouldOffer);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchPost = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/help/posts/${postId}`, { headers });
      const data = await res.json();
      if (data.success) {
        setPost(data.data);
      }
    } catch (error) {
      console.error("Error fetching post:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/users?action=me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUserId(data.data.id);
        setIsVerified(data.data.isVerified);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  }, []);

  const fetchChatMessages = useCallback(async (roomId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/chat?roomId=${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching chat:", error);
    }
  }, []);

  useEffect(() => {
    fetchPost();
    fetchUserData();
  }, [fetchPost, fetchUserData]);

  useEffect(() => {
    if (post && currentUserId) {
      // Find active offer for current user
      const myOffer = post.offers.find(
        (o) =>
          (o.helper.id === currentUserId || post.author.id === currentUserId) &&
          ["accepted", "pending"].includes(o.status)
      );
      if (myOffer) {
        setActiveOffer(myOffer);
        if (myOffer.chatRoomId) {
          fetchChatMessages(myOffer.chatRoomId);
          // Poll for new messages
          const interval = setInterval(() => fetchChatMessages(myOffer.chatRoomId!), 3000);
          return () => clearInterval(interval);
        }
      }
    }
  }, [post, currentUserId, fetchChatMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      const res = await fetch(`/api/help/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newComment }),
      });
      const data = await res.json();
      if (data.success) {
        setNewComment("");
        fetchPost();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleOffer = async (message: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      const res = await fetch(`/api/help/posts/${postId}/offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.success) {
        setShowOfferModal(false);
        fetchPost();
        if (data.data.chatRoomId) {
          setActiveOffer(data.data.offer);
          fetchChatMessages(data.data.chatRoomId);
        }
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeOffer?.chatRoomId) return;
    const token = localStorage.getItem("token");

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId: activeOffer.chatRoomId,
          text: newMessage,
        }),
      });
      setNewMessage("");
      fetchChatMessages(activeOffer.chatRoomId);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleConfirmHelp = async (wasHelped: boolean) => {
    if (!activeOffer) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/help/offers/${activeOffer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: wasHelped ? "was_helped" : "not_helped",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(wasHelped ? "Ajutor confirmat! Mulțumim!" : "Feedback înregistrat.");
        setActiveOffer(null);
        fetchPost();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error confirming help:", error);
    }
  };

  const handleHelperAction = async (action: string) => {
    if (!activeOffer) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/help/offers/${activeOffer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveOffer(null);
        fetchPost();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = post ? `${post.title} - Imperiul Sui Juris` : "";

    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    };

    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      alert("Link copiat!");
    } else {
      window.open(urls[platform], "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p>Postarea nu a fost găsită</p>
          <Link href="/help" className="text-amber-500 hover:text-amber-400 mt-4 inline-block">
            ← Înapoi la feed
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = currentUserId === post.author.id;
  const isHelper = activeOffer?.helper.id === currentUserId;
  const canOffer = isVerified && !isAuthor && post.status === "open" && !activeOffer;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/help"
          className="text-amber-500 hover:text-amber-400 mb-6 inline-flex items-center gap-2"
        >
          ← Înapoi la feed
        </Link>

        {/* Post Header */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: post.category.color }}
              >
                {post.category.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{post.author.fullName}</span>
                  {post.author.isVerified && (
                    <span className="text-green-500">✓</span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {post.category.name} • {new Date(post.createdAt).toLocaleDateString("ro-RO")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.urgency === "urgent" && (
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">
                  🔴 Urgent
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-sm ${
                post.status === "open" ? "bg-green-500/20 text-green-400" :
                post.status === "in_progress" ? "bg-yellow-500/20 text-yellow-400" :
                post.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                "bg-gray-500/20 text-gray-400"
              }`}>
                {post.status === "open" ? "Deschis" :
                 post.status === "in_progress" ? "În progres" :
                 post.status === "completed" ? "Rezolvat" : "Închis"}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
          <p className="text-gray-300 whitespace-pre-wrap mb-4">{post.description}</p>

          {/* Transport details */}
          {(post.fromLocation || post.toLocation) && (
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {post.fromLocation && (
                  <div>
                    <span className="text-gray-400">De la:</span>{" "}
                    <span className="font-medium">{post.fromLocation}</span>
                  </div>
                )}
                {post.toLocation && (
                  <div>
                    <span className="text-gray-400">Până la:</span>{" "}
                    <span className="font-medium">{post.toLocation}</span>
                  </div>
                )}
                {post.vehicleType && (
                  <div>
                    <span className="text-gray-400">Vehicul:</span>{" "}
                    <span className="font-medium">{post.vehicleType}</span>
                  </div>
                )}
                {post.seats && (
                  <div>
                    <span className="text-gray-400">Locuri:</span>{" "}
                    <span className="font-medium">{post.seats}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {post.location && (
            <div className="text-sm text-gray-400 mb-4">📍 {post.location}</div>
          )}

          {/* Images */}
          {post.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {post.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80"
                  onClick={() => window.open(img, "_blank")}
                />
              ))}
            </div>
          )}

          {/* Stats & Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>👁 {post.viewCount} vizualizări</span>
              <span>❤️ {post._count.likes} aprecieri</span>
              <span>💬 {post._count.comments} comentarii</span>
              <span>🤝 {post._count.offers} oferă ajutor</span>
            </div>
            
            {/* Share buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleShare("facebook")}
                className="p-2 hover:bg-gray-700 rounded-lg"
                title="Share pe Facebook"
              >
                📘
              </button>
              <button
                onClick={() => handleShare("whatsapp")}
                className="p-2 hover:bg-gray-700 rounded-lg"
                title="Share pe WhatsApp"
              >
                📱
              </button>
              <button
                onClick={() => handleShare("telegram")}
                className="p-2 hover:bg-gray-700 rounded-lg"
                title="Share pe Telegram"
              >
                ✈️
              </button>
              <button
                onClick={() => handleShare("copy")}
                className="p-2 hover:bg-gray-700 rounded-lg"
                title="Copiază link"
              >
                🔗
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="p-2 hover:bg-gray-700 rounded-lg text-red-400"
                title="Raportează"
              >
                🚩
              </button>
            </div>
          </div>

          {/* Offer button */}
          {canOffer && (
            <button
              onClick={() => setShowOfferModal(true)}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              🤝 Pot Ajuta
            </button>
          )}
        </div>

        {/* Active Help Chat */}
        {activeOffer && activeOffer.chatRoomId && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">💬 Chat Ajutor</h2>
              <span className="text-sm text-amber-400">
                Chat-ul se închide când se confirmă ajutorul
              </span>
            </div>

            {/* Chat Messages */}
            <div className="bg-gray-900 rounded-lg h-64 overflow-y-auto p-4 mb-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Începe conversația...
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-3 ${msg.senderId === currentUserId ? "text-right" : ""}`}
                  >
                    <div
                      className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
                        msg.senderId === currentUserId
                          ? "bg-amber-600 text-white"
                          : "bg-gray-700 text-gray-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Scrie un mesaj..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
              <button
                onClick={handleSendMessage}
                className="bg-amber-600 hover:bg-amber-700 px-6 py-2 rounded-lg"
              >
                Trimite
              </button>
            </div>

            {/* Confirmation Buttons */}
            <div className="border-t border-gray-700 pt-4">
              {isAuthor ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400 mb-2">
                    A fost rezolvată problema ta?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmHelp(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg"
                    >
                      ✅ Am fost ajutat
                    </button>
                    <button
                      onClick={() => handleConfirmHelp(false)}
                      className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg"
                    >
                      ❌ Nu am fost ajutat
                    </button>
                  </div>
                </div>
              ) : isHelper ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400 mb-2">
                    Ai întâmpinat probleme?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleHelperAction("no_help_wanted")}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg text-sm"
                    >
                      Nu vrea ajutor
                    </button>
                    <button
                      onClick={() => handleHelperAction("different_help")}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg text-sm"
                    >
                      Ajutor diferit
                    </button>
                    <button
                      onClick={() => handleHelperAction("report_scam")}
                      className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg text-sm"
                    >
                      🚩 Raportează
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Helpers List */}
        {post.offers.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🤝 Persoane care ajută</h2>
            <div className="space-y-3">
              {post.offers.map((offer) => (
                <div
                  key={offer.id}
                  className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      {offer.helper.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{offer.helper.fullName}</div>
                      <div className="text-sm text-gray-400">
                        {offer.status === "accepted" && "În conversație"}
                        {offer.status === "confirmed" && "✅ A ajutat"}
                        {offer.status === "not_confirmed" && "❌ Nu a ajutat"}
                        {offer.status === "cancelled" && "Anulat"}
                      </div>
                    </div>
                  </div>
                  {offer.helper.isVerified && (
                    <span className="text-green-500">✓ Verificat</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">
            💬 Comentarii ({post.comments.length})
          </h2>

          {/* Add Comment */}
          {isVerified ? (
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Scrie un comentariu..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
              <button
                onClick={handleAddComment}
                className="bg-amber-600 hover:bg-amber-700 px-6 py-2 rounded-lg"
              >
                Trimite
              </button>
            </div>
          ) : (
            <p className="text-gray-400 mb-6">
              Doar utilizatorii verificați pot comenta.{" "}
              <Link href="/verification" className="text-amber-500">
                Verifică-te
              </Link>
            </p>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {post.comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Niciun comentariu încă
              </p>
            ) : (
              post.comments.map((comment) => (
                <div key={comment.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.author.fullName}</span>
                      {comment.author.isVerified && (
                        <span className="text-green-500 text-sm">✓</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(comment.createdAt).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                  <p className="text-gray-300">{comment.text}</p>
                  
                  {/* Comment images */}
                  {comment.images?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {comment.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          className="w-16 h-16 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-600 space-y-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-700/30 rounded p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {reply.author.fullName}
                            </span>
                            {reply.author.isVerified && (
                              <span className="text-green-500 text-xs">✓</span>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <OfferModal
          onClose={() => setShowOfferModal(false)}
          onOffer={handleOffer}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          postId={postId}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

function OfferModal({
  onClose,
  onOffer,
}: {
  onClose: () => void;
  onOffer: (message: string) => void;
}) {
  const [message, setMessage] = useState("");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">🤝 Oferă Ajutor</h2>
        <p className="text-gray-400 mb-4">
          Când apeși "Oferă Ajutor", se va deschide un chat cu persoana care are nevoie.
          Discutați detaliile și apoi confirmați ajutorul.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Scrie un mesaj inițial (opțional)..."
          rows={3}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
          >
            Anulează
          </button>
          <button
            onClick={() => onOffer(message)}
            className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg"
          >
            Oferă Ajutor
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    if (!reason) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/help/posts/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "report", reason, description }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Raportul a fost trimis");
        onClose();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error reporting:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">🚩 Raportează Postarea</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Motiv</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            >
              <option value="">Selectează motivul...</option>
              <option value="spam">Spam</option>
              <option value="scam">Scam/Înșelăciune</option>
              <option value="inappropriate">Conținut inadecvat</option>
              <option value="other">Altceva</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Detalii (opțional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
          >
            Anulează
          </button>
          <button
            onClick={handleReport}
            disabled={!reason || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Se trimite..." : "Raportează"}
          </button>
        </div>
      </div>
    </div>
  );
}
