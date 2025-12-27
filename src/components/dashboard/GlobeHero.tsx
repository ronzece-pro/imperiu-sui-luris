"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function Globe() {
  const [rotation, setRotation] = useState(0);
  const [stats, setStats] = useState({
    citizens: 1234,
    landArea: "2,500 hectares",
    funds: "50,000 credits",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* Globe SVG */}
        <div className="mb-8 perspective">
          <svg
            className="w-48 h-48 md:w-64 md:h-64"
            viewBox="0 0 200 200"
            style={{
              transform: `rotateY(${rotation}deg)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.05s linear",
            }}
          >
            <defs>
              <radialGradient id="globeGradient">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="70%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e40af" />
              </radialGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Main globe sphere */}
            <circle cx="100" cy="100" r="95" fill="url(#globeGradient)" filter="url(#shadow)" />

            {/* Continental shapes (simplified) */}
            <path
              d="M 80 60 Q 100 50 110 65 L 105 85 Q 95 90 80 75 Z"
              fill="#10b981"
              opacity="0.8"
            />
            <path
              d="M 120 85 Q 135 90 140 105 L 130 110 Q 125 100 120 90 Z"
              fill="#10b981"
              opacity="0.8"
            />
            <path
              d="M 60 110 Q 70 115 80 110 L 75 125 Q 65 120 60 115 Z"
              fill="#10b981"
              opacity="0.8"
            />

            {/* Water representation */}
            <circle cx="100" cy="100" r="90" fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.3" />
          </svg>
        </div>

        {/* Title and Motto */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Imperiu Sui Luris</h1>
          <p className="text-xl md:text-2xl text-cyan-300 font-light">Libertate • Fraternitate • Durabilitate</p>
        </div>

        {/* Mission Statement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-2xl">
          <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-cyan-300 border-opacity-20 rounded-lg p-6 text-center hover:bg-opacity-10 transition">
            <div className="text-3xl mb-2">💧</div>
            <h3 className="text-cyan-300 font-semibold mb-2">Apă Curată</h3>
            <p className="text-gray-300 text-sm">Protecția resurselor de apă pentru generații viitoare</p>
          </div>
          <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-cyan-300 border-opacity-20 rounded-lg p-6 text-center hover:bg-opacity-10 transition">
            <div className="text-3xl mb-2">🌾</div>
            <h3 className="text-cyan-300 font-semibold mb-2">Hrană Naturală</h3>
            <p className="text-gray-300 text-sm">Agricultura durabilă și ecosisteme sănătoase</p>
          </div>
          <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-cyan-300 border-opacity-20 rounded-lg p-6 text-center hover:bg-opacity-10 transition">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="text-cyan-300 font-semibold mb-2">Energie Curată</h3>
            <p className="text-gray-300 text-sm">Surse regenerabile pentru viitorul sustenabil</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12 text-center">
          <div>
            <p className="text-3xl md:text-4xl font-bold text-cyan-300">{stats.citizens}</p>
            <p className="text-gray-400 text-sm md:text-base">Cetățeni Activi</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold text-cyan-300">{stats.landArea}</p>
            <p className="text-gray-400 text-sm md:text-base">Teren Protejat</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold text-cyan-300">{stats.funds}</p>
            <p className="text-gray-400 text-sm md:text-base">Fonduri Colectate</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/auth/register"
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105"
          >
            Devino Cetățean
          </Link>
          <Link
            href="/marketplace"
            className="px-8 py-4 bg-white bg-opacity-10 backdrop-blur-sm border border-cyan-300 border-opacity-30 text-white font-semibold rounded-lg hover:bg-opacity-20 transition"
          >
            Explore Piața
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce">
          <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
