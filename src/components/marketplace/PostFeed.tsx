"use client";

import { useState } from "react";

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  price: number;
  currency: string;
  likes: number;
  comments: number;
}

interface Props {
  posts: Post[];
}

export default function PostFeed({ posts }: Props) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "metamask">("stripe");
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedPosts, setPurchasedPosts] = useState<string[]>([]);

  const handleBuyPost = (post: Post) => {
    if (post.price === 0) {
      alert("Aceasta postare este gratuita!");
      return;
    }
    setSelectedPost(post);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedPost) return;

    try {
      setIsProcessing(true);

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Add to purchased posts
      setPurchasedPosts([...purchasedPosts, selectedPost.id]);

      alert(`✓ Postare cumpărată cu succes! 🎉\nAi plătit $${selectedPost.price.toFixed(2)} cu ${paymentMethod.toUpperCase()}`);

      setShowPaymentModal(false);
      setSelectedPost(null);
      setPaymentMethod("stripe");
    } catch (error) {
      alert("Eroare la plată");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
        >
          <div className="flex justify-between items-start gap-4 mb-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">{post.title}</h2>
              <p className="text-sm text-gray-400">Autor: {post.author}</p>
            </div>
            {post.price > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-400">
                  ${post.price.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{post.currency}</p>
              </div>
            )}
            {post.price === 0 && (
              <div className="px-3 py-1 bg-green-900 text-green-200 rounded font-bold text-sm">
                🆓 Gratuit
              </div>
            )}
          </div>

          <p className="text-gray-300 mb-4">{post.content}</p>

          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm text-gray-400">
              <span>❤️ {post.likes}</span>
              <span>💬 {post.comments}</span>
            </div>

            {post.price > 0 && (
              <button
                onClick={() => handleBuyPost(post)}
                disabled={purchasedPosts.includes(post.id)}
                className={`px-6 py-2 rounded-lg font-bold transition ${
                  purchasedPosts.includes(post.id)
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-105"
                }`}
              >
                {purchasedPosts.includes(post.id) ? "✓ Cumpărat" : "🛒 Cumpără"}
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Payment Modal */}
      {showPaymentModal && selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold mb-4">💳 Confirmare Plată</h3>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm mb-1">Postare</p>
              <p className="font-bold text-white">{selectedPost.title}</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">
                ${selectedPost.price.toFixed(2)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-3">Metodă Plată</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="stripe"
                    checked={paymentMethod === "stripe"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "stripe" | "metamask")
                    }
                    className="accent-blue-600"
                  />
                  <div>
                    <p className="font-medium">💳 Din Portofel (Stripe)</p>
                    <p className="text-xs text-gray-400">Soldati din portofelul tău</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="metamask"
                    checked={paymentMethod === "metamask"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "stripe" | "metamask")
                    }
                    className="accent-blue-600"
                  />
                  <div>
                    <p className="font-medium">🔗 MetaMask</p>
                    <p className="text-xs text-gray-400">Plată cu criptomonede</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3 text-sm text-yellow-200 mb-4">
              ⚠️ După confirmare, ${selectedPost.price.toFixed(2)} vor fi deducți din cont.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPost(null);
                  setPaymentMethod("stripe");
                }}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg font-medium transition"
              >
                Anulare
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg font-bold transition"
              >
                {isProcessing ? "Se procesează..." : `Plătește $${selectedPost.price.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
