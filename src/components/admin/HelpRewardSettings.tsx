"use client";

import React, { useEffect, useState } from "react";

interface HelpSettings {
  consecutiveBonusThreshold: number;
  consecutiveBonusAmount: number;
  minimumWithdrawAmount: number;
  pointsPerHelp: number;
  maxActivePostsPerUser: number;
  postCooldownMinutes: number;
  allowedWithdrawMethods: string[];
  badgeLevels: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
    diamond: number;
  };
  ronToLurisRate: number;
}

const DEFAULT_SETTINGS: HelpSettings = {
  consecutiveBonusThreshold: 5,
  consecutiveBonusAmount: 50,
  minimumWithdrawAmount: 150,
  pointsPerHelp: 10,
  maxActivePostsPerUser: 3,
  postCooldownMinutes: 60,
  allowedWithdrawMethods: ["crypto", "revolut", "bank_transfer"],
  badgeLevels: {
    bronze: 5,
    silver: 15,
    gold: 30,
    platinum: 50,
    diamond: 100,
  },
  ronToLurisRate: 1,
};

export default function HelpRewardSettings() {
  const [settings, setSettings] = useState<HelpSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/help/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.data });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/help/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Setări salvate cu succes!" });
      } else {
        setMessage({ type: "error", text: data.error || "Eroare la salvare" });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: "Eroare la salvare" });
    } finally {
      setSaving(false);
    }
  };

  const handleMethodToggle = (method: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedWithdrawMethods: prev.allowedWithdrawMethods.includes(method)
        ? prev.allowedWithdrawMethods.filter((m) => m !== method)
        : [...prev.allowedWithdrawMethods, method],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Reward Settings */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🎁 Setări Recompense
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Puncte per ajutor</label>
            <input
              type="number"
              value={settings.pointsPerHelp}
              onChange={(e) => setSettings({ ...settings, pointsPerHelp: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
            <p className="text-xs text-gray-400 mt-1">Puncte acordate pentru fiecare ajutor confirmat</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Prag bonus consecutiv</label>
            <input
              type="number"
              value={settings.consecutiveBonusThreshold}
              onChange={(e) =>
                setSettings({ ...settings, consecutiveBonusThreshold: parseInt(e.target.value) || 0 })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
            <p className="text-xs text-gray-400 mt-1">Număr de ajutoare consecutive pentru bonus</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bonus consecutiv (RON)</label>
            <input
              type="number"
              value={settings.consecutiveBonusAmount}
              onChange={(e) =>
                setSettings({ ...settings, consecutiveBonusAmount: parseInt(e.target.value) || 0 })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
            <p className="text-xs text-gray-400 mt-1">
              Suma în RON acordată la {settings.consecutiveBonusThreshold} ajutoare consecutive
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rată conversie RON → LURIS</label>
            <input
              type="number"
              step="0.1"
              value={settings.ronToLurisRate}
              onChange={(e) =>
                setSettings({ ...settings, ronToLurisRate: parseFloat(e.target.value) || 1 })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
            <p className="text-xs text-gray-400 mt-1">1 RON = {settings.ronToLurisRate} LURIS</p>
          </div>
        </div>
      </div>

      {/* Withdrawal Settings */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          💸 Setări Retragere
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Suma minimă retragere (RON)</label>
            <input
              type="number"
              value={settings.minimumWithdrawAmount}
              onChange={(e) =>
                setSettings({ ...settings, minimumWithdrawAmount: parseInt(e.target.value) || 0 })
              }
              className="w-full max-w-xs bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Metode de retragere permise</label>
            <div className="flex flex-wrap gap-3">
              {["crypto", "revolut", "bank_transfer"].map((method) => (
                <button
                  key={method}
                  onClick={() => handleMethodToggle(method)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    settings.allowedWithdrawMethods.includes(method)
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-400"
                  }`}
                >
                  {method === "crypto" && "🪙 Crypto"}
                  {method === "revolut" && "💳 Revolut"}
                  {method === "bank_transfer" && "🏦 Transfer bancar"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Post Limits */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📝 Limite Postări
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Postări active maxime per user</label>
            <input
              type="number"
              value={settings.maxActivePostsPerUser}
              onChange={(e) =>
                setSettings({ ...settings, maxActivePostsPerUser: parseInt(e.target.value) || 1 })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cooldown între postări (minute)</label>
            <input
              type="number"
              value={settings.postCooldownMinutes}
              onChange={(e) =>
                setSettings({ ...settings, postCooldownMinutes: parseInt(e.target.value) || 0 })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
            />
          </div>
        </div>
      </div>

      {/* Badge Levels */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🏅 Niveluri Badge-uri
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Număr de ajutoare necesare pentru fiecare nivel de badge
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(settings.badgeLevels).map(([level, count]) => (
            <div key={level}>
              <label className="block text-sm font-medium mb-2 capitalize flex items-center gap-2">
                {level === "bronze" && "🥉"}
                {level === "silver" && "🥈"}
                {level === "gold" && "🥇"}
                {level === "platinum" && "💎"}
                {level === "diamond" && "💠"}
                {level}
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    badgeLevels: {
                      ...settings.badgeLevels,
                      [level]: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {saving ? "Se salvează..." : "💾 Salvează Setările"}
        </button>
      </div>
    </div>
  );
}
