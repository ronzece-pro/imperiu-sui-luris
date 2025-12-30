"use client";

import { useState, useEffect } from "react";

export default function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({
    stripe: { enabled: false, adminToggle: false, configured: false },
    metamask: { enabled: false, configured: false },
    bankTransfer: { enabled: true },
    luris: { name: "Luris", symbol: "LURIS", conversionRate: 0.1, onlyLurisMarketplace: true },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/payment-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Error loading payment settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (setting: string, value: boolean) => {
    setLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ setting, value }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        await loadSettings();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error("Error toggling setting:", error);
      setMessage("❌ Eroare la salvare");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !settings.stripe.configured) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">🔄 Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          💳 Setări Plăți
        </h2>
        <p className="text-slate-300 text-sm">
          Controlează metodele de plată disponibile pe site. Stripe poate fi activat/dezactivat instant.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.startsWith("✅")
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* Stripe Settings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              💳 Stripe
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Plăți cu card prin Stripe
              {!settings.stripe.configured && (
                <span className="ml-2 text-yellow-400">(Nu este configurat în .env)</span>
              )}
            </p>
          </div>
          <button
            onClick={() => handleToggle("stripeToggle", !settings.stripe.adminToggle)}
            disabled={loading || !settings.stripe.configured}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
              settings.stripe.adminToggle && settings.stripe.configured
                ? "bg-green-500"
                : "bg-slate-600"
            } ${!settings.stripe.configured ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                settings.stripe.adminToggle && settings.stripe.configured ? "translate-x-11" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="text-sm text-slate-400">
          <p>
            Status:{" "}
            <span
              className={`font-semibold ${
                settings.stripe.adminToggle && settings.stripe.configured
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {settings.stripe.adminToggle && settings.stripe.configured ? "✓ Activ pe site" : "✗ Dezactivat"}
            </span>
          </p>
          {settings.stripe.configured && (
            <p className="mt-2 text-xs text-slate-500">
              Când este activ, utilizatorii pot încărca Luris folosind carduri Stripe. Când este dezactivat, opțiunea dispare de pe site.
            </p>
          )}
        </div>
      </div>

      {/* MetaMask Settings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              🦊 MetaMask (Crypto)
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Plăți directe cu crypto (ETH/MATIC/BSC)
              {!settings.metamask.configured && (
                <span className="ml-2 text-yellow-400">(Nu este configurat în .env)</span>
              )}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-semibold ${
              settings.metamask.configured ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"
            }`}
          >
            {settings.metamask.configured ? "✓ Configurat" : "✗ Neconfigurat"}
          </div>
        </div>
        <p className="text-sm text-slate-400">
          MetaMask este întotdeauna activ când este configurat. Utilizatorii pot plăti direct cu ETH/MATIC/BNB.
        </p>
      </div>

      {/* Bank Transfer Settings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              🏦 Transfer Bancar / Revolut
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Depuneri manuale prin transfer bancar (afișează adresă crypto unică)
            </p>
          </div>
          <button
            onClick={() => handleToggle("bankTransferToggle", !settings.bankTransfer.enabled)}
            disabled={loading}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
              settings.bankTransfer.enabled ? "bg-green-500" : "bg-slate-600"
            } cursor-pointer`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                settings.bankTransfer.enabled ? "translate-x-11" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="text-sm text-slate-400">
          <p>
            Status:{" "}
            <span className={`font-semibold ${settings.bankTransfer.enabled ? "text-green-400" : "text-red-400"}`}>
              {settings.bankTransfer.enabled ? "✓ Activ" : "✗ Dezactivat"}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Când este activ, utilizatorii pot solicita o adresă crypto unică pentru depuneri manuale. După transfer, adminul verifică și creditează manual.
          </p>
        </div>
      </div>

      {/* Luris Settings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            💎 Luris (Moneda Proprie)
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Moneda internă folosită pentru toate achizițiile pe marketplace
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-slate-400">Nume</p>
            <p className="text-white font-bold text-lg">{settings.luris.name}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-slate-400">Simbol</p>
            <p className="text-white font-bold text-lg">{settings.luris.symbol}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-slate-400">Rată Conversie</p>
            <p className="text-white font-bold text-lg">1 LURIS = ${settings.luris.conversionRate}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-slate-400">Marketplace</p>
            <p className="text-green-400 font-bold text-lg">
              {settings.luris.onlyLurisMarketplace ? "✓ Doar LURIS" : "Multiple valute"}
            </p>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
          <p className="text-blue-400 text-sm">
            ℹ️ <strong>Important:</strong> Toate produsele și serviciile pe marketplace sunt listate exclusiv în LURIS. Utilizatorii trebuie să încarce LURIS în portofel pentru a cumpăra.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl p-6">
        <h3 className="text-white font-bold mb-3">📊 Sumar Metode de Plată Active</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {settings.stripe.adminToggle && settings.stripe.configured ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className="text-slate-300">Stripe (Card)</span>
          </div>
          <div className="flex items-center gap-2">
            {settings.metamask.configured ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className="text-slate-300">MetaMask (Crypto Direct)</span>
          </div>
          <div className="flex items-center gap-2">
            {settings.bankTransfer.enabled ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className="text-slate-300">Transfer Bancar / Revolut</span>
          </div>
        </div>
      </div>
    </div>
  );
}
