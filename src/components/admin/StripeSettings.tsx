"use client";

import { useState } from "react";

export default function AdminStripeSettings() {
  const [publicKey, setPublicKey] = useState(
    process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ""
  );
  const [secretKey, setSecretKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(!!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    if (!publicKey.trim() || !secretKey.trim()) {
      setMessage("Te rog completează ambele chei");
      return;
    }

    try {
      setIsSaving(true);
      // In production, send to secure API endpoint
      // For now, store in localStorage for demo
      localStorage.setItem(
        "stripe_settings",
        JSON.stringify({
          publicKey,
          secretKey,
          isEnabled,
          updatedAt: new Date().toISOString(),
        })
      );
      setMessage("Setări Stripe salvate cu succes!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Eroare la salvarea setarilor");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-900 border border-yellow-700 rounded-xl p-4 text-yellow-200 text-sm">
        ⚠️ <strong>Important:</strong> Păstrează cheile tale secrete în siguranță. Nu le
        partaja niciodată public.
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Cheie Publică Stripe
          </label>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="pk_live_..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Obține de la https://dashboard.stripe.com
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Cheie Secretă Stripe
          </label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="sk_live_..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Keep this secure - never expose in client code
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="stripe_enabled"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <label htmlFor="stripe_enabled" className="text-sm font-medium cursor-pointer">
            Activează Stripe Payments
          </label>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes("succes")
                ? "bg-green-900 text-green-200"
                : "bg-red-900 text-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition"
        >
          {isSaving ? "Se salvează..." : "Salvează Setări"}
        </button>
      </div>

      {/* Stripe Integration Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-bold mb-4">Integrare Stripe</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            ✅ <strong>Metoda Plații:</strong> Carduri de credit/debit
          </p>
          <p>
            ✅ <strong>Comisii:</strong> 2.9% + $0.30 per tranzacție
          </p>
          <p>
            ✅ <strong>Depuneri:</strong> Automate peste 2 zile lucrătoare
          </p>
          <p>
            ✅ <strong>Securitate:</strong> PCI DSS Level 1 compliant
          </p>
        </div>
      </div>
    </div>
  );
}
