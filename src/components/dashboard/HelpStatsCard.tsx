"use client";

import React, { useEffect, useState } from "react";

interface HelpStats {
  totalHelpsGiven: number;
  totalHelpsReceived: number;
  totalPoints: number;
  rewardBalance: number;
  consecutiveHelps: number;
  badgeLevel: string | null;
}

interface BadgeInfo {
  level: string;
  icon: string;
  label: string;
  color: string;
}

const BADGE_INFO: Record<string, BadgeInfo> = {
  bronze: { level: "bronze", icon: "🥉", label: "Bronze", color: "text-amber-600" },
  silver: { level: "silver", icon: "🥈", label: "Argint", color: "text-gray-400" },
  gold: { level: "gold", icon: "🥇", label: "Aur", color: "text-yellow-400" },
  platinum: { level: "platinum", icon: "💎", label: "Platină", color: "text-blue-400" },
  diamond: { level: "diamond", icon: "💠", label: "Diamant", color: "text-purple-400" },
};

export default function HelpStatsCard() {
  const [stats, setStats] = useState<HelpStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("/api/help/rewards", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
          setStats(data.data.stats);
        }
      } catch (error) {
        console.error("Error fetching help stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const badge = stats.badgeLevel ? BADGE_INFO[stats.badgeLevel] : null;

  return (
    <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🤝 Statistici Ajutor
        </h3>
        {badge && (
          <span
            className={`flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 ${badge.color}`}
          >
            {badge.icon} {badge.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.totalHelpsGiven}</div>
          <div className="text-xs text-gray-400">Ajutoare oferite</div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.totalHelpsReceived}</div>
          <div className="text-xs text-gray-400">Ajutoare primite</div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.totalPoints}</div>
          <div className="text-xs text-gray-400">Puncte</div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {stats.rewardBalance.toFixed(2)} RON
          </div>
          <div className="text-xs text-gray-400">Balanță recompense</div>
        </div>
      </div>

      {stats.consecutiveHelps > 0 && (
        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
          <span className="text-amber-400">
            🔥 {stats.consecutiveHelps} ajutoare consecutive! 
            {stats.consecutiveHelps >= 5 && " Ai primit bonus!"}
          </span>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <a
          href="/help"
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1"
        >
          Vezi comunitatea →
        </a>
      </div>
    </div>
  );
}
