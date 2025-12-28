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
        {/* 3D Romania Globe */}
        <div className="mb-12 perspective h-80 flex items-center justify-center">
          <svg
            className="w-72 h-72"
            viewBox="0 0 300 300"
            style={{
              transform: `rotateY(${rotation}deg) rotateX(20deg)`,
              transformStyle: "preserve-3d",
              transition: "transform 0.05s linear",
              filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))",
            }}
          >
            <defs>
              <radialGradient id="globeGradient3D">
                <stop offset="0%" stopColor="#1e40af" />
                <stop offset="60%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#0c4a6e" />
              </radialGradient>
              <filter id="shadow3D">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.4" />
              </filter>
              <linearGradient id="tricolor" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#002B7F" />
                <stop offset="33%" stopColor="#FCD116" />
                <stop offset="66%" stopColor="#FCD116" />
                <stop offset="100%" stopColor="#CE1126" />
              </linearGradient>
            </defs>

            {/* Background sphere - ocean */}
            <circle cx="150" cy="150" r="140" fill="url(#globeGradient3D)" filter="url(#shadow3D)" />

            {/* Romania shape - simplified but recognizable */}
            {/* Wallachia region - Red (CE1126) */}
            <path
              d="M 120 180 Q 130 185 140 190 Q 145 195 140 200 Q 130 205 120 200 Q 115 195 120 180 Z"
              fill="#CE1126"
              opacity="0.95"
            />

            {/* Moldavia region - Yellow (FCD116) */}
            <path
              d="M 140 160 Q 150 165 155 175 Q 150 180 140 185 Q 135 175 140 160 Z"
              fill="#FCD116"
              opacity="0.95"
            />

            {/* Transylvania region - Blue (002B7F) */}
            <path
              d="M 130 145 Q 145 150 155 160 Q 150 165 140 160 Q 135 155 130 145 Z"
              fill="#002B7F"
              opacity="0.95"
            />

            {/* Dobrogea region - mixing colors */}
            <path
              d="M 155 175 Q 165 180 170 190 Q 165 195 160 190 Q 158 185 155 175 Z"
              fill="#CE1126"
              opacity="0.9"
            />

            {/* Muntenia region */}
            <path
              d="M 140 190 Q 155 195 160 205 Q 155 210 145 205 Q 140 200 140 190 Z"
              fill="#FCD116"
              opacity="0.9"
            />

            {/* Main borders - darker outline */}
            <path
              d="M 120 180 L 130 145 L 155 160 L 155 175 L 170 190 L 160 205 L 145 205 L 140 190 Z"
              fill="none"
              stroke="#1e293b"
              strokeWidth="2"
              opacity="0.8"
            />

            {/* 3D depth effect - shadow side */}
            <circle cx="150" cy="150" r="135" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="8" opacity="0.3" />

            {/* Highlight on top */}
            <ellipse cx="130" cy="130" rx="40" ry="45" fill="white" opacity="0.08" />
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
