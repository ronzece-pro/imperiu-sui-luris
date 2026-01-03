"use client";

import { useState, useEffect } from "react";

interface PaymentSettingsData {
  stripe: { enabled: boolean; adminToggle: boolean; configured: boolean };
  metamask: { enabled: boolean; configured: boolean };
  bankTransfer: { enabled: boolean };
  hdWallet: { enabled: boolean; configured: boolean };
  luris: { name: string; symbol: string; conversionRate: number; onlyLurisMarketplace: boolean };
}

export default function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<PaymentSettingsData>({
    stripe: { enabled: false, adminToggle: false, configured: false },
    metamask: { enabled: false, configured: false },
    bankTransfer: { enabled: false },
    hdWallet: { enabled: true, configured: false },
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

      {/* HD Wallet Settings - PRIMARY METHOD */}
      <div className="bg-gradient-to-r from-green-800/30 to-emerald-800/30 border-2 border-green-500/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              🔐 HD Wallet (Recomandat)
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Adrese unice per utilizator - USDT/USDC pe Polygon, BSC, Ethereum
              {!settings.hdWallet?.configured && (
                <span className="ml-2 text-yellow-400">(MASTER_WALLET_SEED nu este configurat)</span>
              )}
            </p>
          </div>
          <button
            onClick={() => handleToggle("hdWalletToggle", !settings.hdWallet?.enabled)}
            disabled={loading || !settings.hdWallet?.configured}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
              settings.hdWallet?.enabled && settings.hdWallet?.configured
                ? "bg-green-500"
                : "bg-slate-600"
            } ${!settings.hdWallet?.configured ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                settings.hdWallet?.enabled && settings.hdWallet?.configured ? "translate-x-11" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="text-sm text-slate-400">
          <p>
            Status:{" "}
            <span
              className={`font-semibold ${
                settings.hdWallet?.enabled && settings.hdWallet?.configured
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {settings.hdWallet?.enabled && settings.hdWallet?.configured ? "✓ Activ - Metoda principală" : "✗ Dezactivat"}
            </span>
          </p>
          <p className="mt-2 text-xs text-green-400 bg-green-500/10 p-2 rounded">
            ✓ Comisiune ~$0.05 pe Polygon | ✓ Fiecare user primește adresă unică | ✓ Creditare automată
          </p>
        </div>
      </div>

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
              Comisiune: 2.9% + $0.30 per tranzacție
            </p>
          )}
        </div>
      </div>

      {/* MetaMask Settings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              🦊 MetaMask (Direct Pay)
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Plăți directe cu wallet conectat
              {!settings.metamask.configured && (
                <span className="ml-2 text-yellow-400">(METAMASK_WALLET nu este configurat)</span>
              )}
            </p>
          </div>
          <button
            onClick={() => handleToggle("metamaskToggle", !settings.metamask.enabled)}
            disabled={loading || !settings.metamask.configured}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
              settings.metamask.enabled && settings.metamask.configured
                ? "bg-green-500"
                : "bg-slate-600"
            } ${!settings.metamask.configured ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                settings.metamask.enabled && settings.metamask.configured ? "translate-x-11" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="text-sm text-slate-400">
          <p>
            Status:{" "}
            <span
              className={`font-semibold ${
                settings.metamask.enabled && settings.metamask.configured
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {settings.metamask.enabled && settings.metamask.configured ? "✓ Activ" : "✗ Dezactivat"}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Utilizatorii plătesc direct din wallet-ul lor conectat. Comisiuni variabile pe rețea.
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
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl p-6">
        <h3 className="text-white font-bold mb-3">📊 Sumar Metode de Plată Active</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {settings.hdWallet?.enabled && settings.hdWallet?.configured ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className="text-slate-300">HD Wallet Crypto (USDT/USDC) - Recomandat</span>
          </div>
          <div className="flex items-center gap-2">
            {settings.stripe.adminToggle && settings.stripe.configured ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className="text-slate-300">Stripe (Card)</span>
          </div>
          <div className="flex items-center gap-2">
            {settings.metamask.enabled && settings.metamask.configured ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
            <span className="text-slate-300">MetaMask (Direct Pay)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
