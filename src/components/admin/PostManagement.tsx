"use client";

import { useState, useEffect, useRef } from "react";

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  image?: string;
  price: number;
  currency: "USD" | "LURIS";
  createdAt: string;
  likes: number;
  comments: number;
}

export default function AdminPostManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image: null as File | null,
    price: 0,
    currency: "USD" as "USD" | "LURIS",
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const mockPosts: Post[] = [
        {
          id: "post_1",
          title: "Document Oficial - Certificat Cetățenie",
          content: "Certificat oficial de cetățenie cu drepturi depline în Imperiul Sui Luris...",
          author: "admin",
          price: 50,
          currency: "USD",
          createdAt: "2024-03-15",
          likes: 234,
          comments: 45,
        },
        {
          id: "post_2",
          title: "Teren Premium - Loc Central",
          content: "Teren premium în locație centrală cu acces la toate facilitățile...",
          author: "admin",
          price: 99.99,
          currency: "USD",
          createdAt: "2024-03-14",
          likes: 156,
          comments: 28,
        },
        {
          id: "post_3",
          title: "Anunț Gratuit - Informații Generale",
          content: "Informații gratuite despre Imperiul Sui Luris și cum să devii cetățean...",
          author: "admin",
          price: 0,
          currency: "USD",
          createdAt: "2024-03-13",
          likes: 512,
          comments: 87,
        },
      ];
      setPosts(mockPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
    }
  };

  const handleCreatePost = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Te rog completează titlul și conținutul");
      return;
    }

    try {
      const newPost: Post = {
        id: `post_${Date.now()}`,
        title: formData.title,
        content: formData.content,
        author: "admin",
        price: formData.price,
        currency: formData.currency,
        createdAt: new Date().toISOString().split("T")[0],
        likes: 0,
        comments: 0,
      };

      setPosts((prev) => [newPost, ...prev]);
      setFormData({ title: "", content: "", image: null, price: 0, currency: "USD" });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Eroare la crearea postării");
    }
  };

  const handleDeletePost = (id: string) => {
    if (confirm("Sunteti sigur ca doriti sa stergeți aceasta postare?")) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleEditPost = async () => {
    if (!selectedPost) return;

    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Te rog completează titlul și conținutul");
      return;
    }

    try {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id
            ? {
                ...p,
                title: formData.title,
                content: formData.content,
                price: formData.price,
                currency: formData.currency,
              }
            : p
        )
      );
      setShowEditModal(false);
      setSelectedPost(null);
      setFormData({ title: "", content: "", image: null, price: 0, currency: "USD" });
    } catch (error) {
      console.error("Error editing post:", error);
      alert("Eroare la editarea postării");
    }
  };

  const openEditModal = (post: Post) => {
    setSelectedPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      image: null,
      price: post.price,
      currency: post.currency,
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Create Post Button */}
      <div>
        <button
          onClick={() => {
            setFormData({ title: "", content: "", image: null, price: 0, currency: "USD" });
            setShowCreateModal(true);
          }}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition w-full sm:w-auto"
        >
          ➕ Creează Postare Nouă
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Se încarcă...</div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 hover:border-gray-700 transition"
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{post.title}</h3>
                    {post.price > 0 && (
                      <span className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded font-bold">
                        💰 ${post.price.toFixed(2)}
                      </span>
                    )}
                    {post.price === 0 && (
                      <span className="px-2 py-1 bg-green-900 text-green-200 text-xs rounded font-bold">
                        🆓 Gratuit
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {post.createdAt} • {post.author}
                  </p>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                {post.content}
              </p>

              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="text-xs text-gray-400 space-x-4 flex">
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(post)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                >
                  ✏️ Editare
                </button>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
                >
                  🗑️ Ștergere
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
            <p>Nu exista postari inca</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">
              {showEditModal ? "Editare Postare" : "Postare Nouă"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titlu</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Introdu titlul postării..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Conținut</label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Introdu conținutul postării..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Preț</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    step="0.01"
                    min="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    0 = Gratuit | {">"} 0 = Plătit
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Monedă</label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        currency: e.target.value as "USD" | "LURIS",
                      }))
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="USD">💵 USD</option>
                    <option value="LURIS">💎 LURIS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Imagine</label>
                <button
                  onClick={handleFileSelect}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-700 rounded-lg transition text-center"
                >
                  📁 Selectează Imagine
                  {formData.image && (
                    <span className="block text-sm text-green-400 mt-1">
                      ✓ {formData.image.name}
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedPost(null);
                  setFormData({ title: "", content: "", image: null, price: 0, currency: "USD" });
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
              >
                Anulare
              </button>
              <button
                onClick={
                  showEditModal ? handleEditPost : handleCreatePost
                }
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
              >
                {showEditModal ? "Salvare" : "Creează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
