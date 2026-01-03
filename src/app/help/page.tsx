"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description?: string;
  _count?: { posts: number };
}

interface HelpPost {
  id: string;
  title: string;
  description: string;
  images: string[];
  location?: string;
  urgency: "normal" | "urgent";
  status: string;
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
  _count: {
    comments: number;
    likes: number;
    offers: number;
  };
}

interface UserStats {
  totalHelpsGiven: number;
  totalHelpsReceived: number;
  consecutiveHelps: number;
  badgeLevel: string;
}

export default function HelpPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [posts, setPosts] = useState<HelpPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/help/categories?withCount=true");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (urgencyFilter) params.set("urgency", urgencyFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/help/posts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.data.posts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }, [selectedCategory, urgencyFilter, searchQuery]);

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      return;
    }

    try {
      const [userRes, statsRes] = await Promise.all([
        fetch("/api/users?action=me", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/help/rewards", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const userData = await userRes.json();
      if (userData.success && userData.data?.user) {
        setIsLoggedIn(true);
        setIsVerified(userData.data.user.isVerified === true);
      }

      const statsData = await statsRes.json();
      if (statsData.success) {
        setUserStats(statsData.data.stats);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchPosts(), fetchUserData()]);
      setLoading(false);
    };
    loadData();
  }, [fetchCategories, fetchPosts, fetchUserData]);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, urgencyFilter, fetchPosts]);

  const handleLike = async (postId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      await fetch(`/api/help/posts/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "like" }),
      });
      fetchPosts();
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const getBadgeEmoji = (level: string) => {
    const badges: Record<string, string> = {
      none: "",
      bronze: "🥉",
      silver: "🥈",
      gold: "🥇",
      platinum: "💎",
    };
    return badges[level] || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-800 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">🤝 Ajutor Reciproc</h1>
          <p className="text-amber-100 text-lg mb-6">
            Aici cetățenii Imperiului se ajută între ei. Cere sau oferă ajutor, câștigă recompense!
          </p>

          {/* User Stats Banner */}
          {isLoggedIn && userStats && (
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm inline-block">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-amber-200">Am ajutat:</span>{" "}
                  <strong>{userStats.totalHelpsGiven}</strong> persoane{" "}
                  {getBadgeEmoji(userStats.badgeLevel)}
                </div>
                <div>
                  <span className="text-amber-200">Am fost ajutat:</span>{" "}
                  <strong>{userStats.totalHelpsReceived}</strong> ori
                </div>
                <div>
                  <span className="text-amber-200">Serie:</span>{" "}
                  <strong>{userStats.consecutiveHelps}</strong>/5 pentru bonus
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Categories Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-2xl font-semibold">Categorii de Ajutor</h2>
            <div className="flex gap-3">
              {isLoggedIn && isVerified && (
                <>
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <span>🤝</span> Oferă Ajutor
                  </button>
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <span>🙏</span> Cere Ajutor
                  </button>
                </>
              )}
              {isLoggedIn && !isVerified && (
                <Link
                  href="/verification"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  🔒 Verifică-te pentru a posta
                </Link>
              )}
              {!isLoggedIn && (
                <Link
                  href="/auth/login"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Conectează-te
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* All categories card */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`p-4 rounded-xl transition-all ${
                selectedCategory === null
                  ? "bg-amber-600 ring-2 ring-amber-400"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              <div className="text-3xl mb-2">🌐</div>
              <div className="font-medium">Toate</div>
              <div className="text-sm text-gray-400">
                {posts.length} postări
              </div>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`p-4 rounded-xl transition-all text-left ${
                  selectedCategory === cat.slug
                    ? "ring-2 ring-amber-400"
                    : "hover:scale-105"
                }`}
                style={{
                  backgroundColor:
                    selectedCategory === cat.slug ? cat.color : undefined,
                  background:
                    selectedCategory !== cat.slug
                      ? `linear-gradient(135deg, ${cat.color}20, ${cat.color}40)`
                      : undefined,
                }}
              >
                <div className="text-3xl mb-2">{cat.icon}</div>
                <div className="font-medium">{cat.name}</div>
                <div className="text-sm opacity-70">
                  {cat._count?.posts || 0} cereri
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="🔍 Caută..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Toate prioritățile</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="normal">🟢 Normal</option>
          </select>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">📭</div>
              <p>Nu sunt cereri de ajutor în această categorie.</p>
              {isLoggedIn && isVerified && (
                <div className="flex gap-4 justify-center mt-4">
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="text-green-500 hover:text-green-400"
                  >
                    🤝 Oferă primul ajutor!
                  </button>
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="text-amber-500 hover:text-amber-400"
                  >
                    🙏 Cere ajutor!
                  </button>
                </div>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: post.category.color }}
                    >
                      {post.category.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{post.author.fullName}</span>
                        {post.author.isVerified && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {post.category.name} •{" "}
                        {new Date(post.createdAt).toLocaleDateString("ro-RO")}
                      </div>
                    </div>
                  </div>
                  {post.urgency === "urgent" && (
                    <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                      🔴 Urgent
                    </span>
                  )}
                </div>

                {/* Post Content */}
                <Link href={`/help/post/${post.id}`}>
                  <h3 className="text-xl font-semibold mb-2 hover:text-amber-400 transition-colors">
                    {post.title}
                  </h3>
                </Link>
                <p className="text-gray-300 mb-4 line-clamp-3">{post.description}</p>

                {/* Location */}
                {post.location && (
                  <div className="text-sm text-gray-400 mb-4">
                    📍 {post.location}
                  </div>
                )}

                {/* Images Preview */}
                {post.images.length > 0 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto">
                    {post.images.slice(0, 3).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                    {post.images.length > 3 && (
                      <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center">
                        +{post.images.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      ❤️ {post._count.likes}
                    </button>
                    <Link
                      href={`/help/post/${post.id}`}
                      className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      💬 {post._count.comments}
                    </Link>
                    <button className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors">
                      🔗 Share
                    </button>
                  </div>

                  {isLoggedIn && isVerified && post.status === "open" && (
                    <Link
                      href={`/help/post/${post.id}?offer=true`}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      🤝 Pot Ajuta
                    </Link>
                  )}

                  {post._count.offers > 0 && (
                    <span className="text-amber-400 text-sm">
                      {post._count.offers} persoană oferă ajutor
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Offer Help Modal - uses existing categories */}
      {showOfferModal && (
        <OfferHelpModal
          categories={categories}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => {
            setShowOfferModal(false);
            fetchPosts();
            fetchCategories();
          }}
        />
      )}

      {/* Request Help Modal - allows creating new categories */}
      {showRequestModal && (
        <RequestHelpModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            fetchPosts();
            fetchCategories();
          }}
        />
      )}
    </div>
  );
}

// Offer Help Modal Component - uses existing categories
function OfferHelpModal({
  categories,
  onClose,
  onSuccess,
}: {
  categories: HelpCategory[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    categoryId: "",
    title: "",
    description: "",
    location: "",
    urgency: "normal",
    fromLocation: "",
    toLocation: "",
    vehicleType: "",
    seats: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);
  const isTransport = selectedCategory?.slug === "transport";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.categoryId) {
      setError("Te rugăm să selectezi o categorie");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/help/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId: formData.categoryId,
          title: formData.title,
          description: formData.description,
          images,
          location: formData.location || undefined,
          urgency: formData.urgency,
          fromLocation: isTransport ? formData.fromLocation : undefined,
          toLocation: isTransport ? formData.toLocation : undefined,
          vehicleType: isTransport ? formData.vehicleType : undefined,
          seats: isTransport && formData.seats ? parseInt(formData.seats) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || "Eroare la crearea postării");
      }
    } catch {
      setError("Eroare de conexiune. Te rugăm să încerci din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">🤝 Oferă Ajutor</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
          </div>

          <p className="text-gray-400 mb-4">
            Descrie cum poți ajuta pe alții din comunitate. Selectează o categorie existentă.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selection - Required */}
            <div>
              <label className="block text-sm font-medium mb-2">Categorie *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                required
              >
                <option value="">Selectează o categorie...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Ce oferă ajutor poți oferi? *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="ex: Ofer transport București - Brașov"
                required
                minLength={5}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Descriere detaliată *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrie în detaliu ce ajutor poți oferi, când ești disponibil, etc..."
                required
                minLength={20}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
            </div>

            {/* Transport-specific fields */}
            {isTransport && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">De unde</label>
                  <input
                    type="text"
                    value={formData.fromLocation}
                    onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                    placeholder="Oraș/Localitate"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Până unde</label>
                  <input
                    type="text"
                    value={formData.toLocation}
                    onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                    placeholder="Oraș/Localitate"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tip vehicul</label>
                  <input
                    type="text"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    placeholder="ex: Autoturism, Duba"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Locuri disponibile</label>
                  <input
                    type="number"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    placeholder="ex: 3"
                    min={1}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  />
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Localitatea ta</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="ex: București, Sector 3"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium mb-2">Poze (opțional)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
              {images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg">{error}</div>}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Se trimite..." : "Publică Oferta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Request Help Modal Component - allows creating new categories
function RequestHelpModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    categoryName: "",
    title: "",
    description: "",
    location: "",
    urgency: "normal",
  });
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.categoryName.trim()) {
      setError("Te rugăm să specifici tipul de ajutor de care ai nevoie");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/help/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryName: formData.categoryName.trim(),
          title: formData.title,
          description: formData.description,
          images,
          location: formData.location || undefined,
          urgency: formData.urgency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || "Eroare la crearea cererii");
      }
    } catch {
      setError("Eroare de conexiune. Te rugăm să încerci din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">🙏 Cere Ajutor</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
          </div>

          <p className="text-gray-400 mb-4">
            Descrie ce ajutor ai nevoie. O nouă categorie va fi creată automat dacă nu există deja una similară.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Name - Creates new category */}
            <div>
              <label className="block text-sm font-medium mb-2">Ce tip de ajutor ai nevoie? *</label>
              <input
                type="text"
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                placeholder="ex: Ajutor cu mutatul, Reparații electrice, Îngrijire copii..."
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Aceasta va crea o nouă categorie dacă nu există deja una similară
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Titlu cerere *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="ex: Am nevoie de ajutor cu mutatul mobilei"
                required
                minLength={5}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Descriere detaliată *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrie în detaliu ce ajutor ai nevoie, când, unde, etc..."
                required
                minLength={20}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Localitatea ta</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="ex: București, Sector 3"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium mb-2">Prioritate</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="normal"
                    checked={formData.urgency === "normal"}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="text-amber-500"
                  />
                  🟢 Normal
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="urgent"
                    checked={formData.urgency === "urgent"}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="text-amber-500"
                  />
                  🔴 Urgent
                </label>
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium mb-2">Poze (opțional)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
              {images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg">{error}</div>}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Se trimite..." : "Trimite Cererea"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
