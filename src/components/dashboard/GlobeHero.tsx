"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function Globe() {
  const [stats] = React.useState({
    citizens: 1234,
    landArea: "2,500 hectares",
    funds: "50,000 credits",
  });

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950">
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-48 sm:w-64 md:w-96 h-48 sm:h-64 md:h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-48 sm:w-64 md:w-96 h-48 sm:h-64 md:h-96 bg-cyan-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
      </div>

      {/* Content Container - Scrollable on small screens */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-3 sm:px-4 py-8 sm:py-12 md:py-20 min-h-screen">
        {/* Stema Image - Responsive */}
        <div className="mb-6 sm:mb-8 md:mb-12 flex items-center justify-center flex-shrink-0">
          <div className="relative w-40 sm:w-56 md:w-72 h-40 sm:h-56 md:h-72">
            <Image
              src="/stema.png"
              alt="Stema Imperiul Sui Juris"
              fill
              priority
              className="drop-shadow-2xl hover:scale-105 transition-transform duration-300 object-contain"
            />
          </div>
        </div>

        {/* Title and Motto - Responsive text */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 px-2">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-4 leading-tight">IMPERIUL SUI JURIS</h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-cyan-300 font-light">Libertate • Fraternitate • Durabilitate</p>
        </div>

        {/* Mission Statement - Stack on mobile, 3 cols on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-10 md:mb-12 w-full max-w-6xl px-2">
          <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-cyan-300 border-opacity-20 rounded-lg p-4 sm:p-5 md:p-6 text-center hover:bg-opacity-10 transition">
            <div className="text-2xl sm:text-3xl mb-2">💧</div>
            <h3 className="text-cyan-300 font-semibold mb-2 text-sm sm:text-base">Apă Curată</h3>
            <p className="text-gray-300 text-xs sm:text-sm">Protecția resurselor de apă pentru generații viitoare</p>
          </div>
          <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-cyan-300 border-opacity-20 rounded-lg p-4 sm:p-5 md:p-6 text-center hover:bg-opacity-10 transition">
            <div className="text-2xl sm:text-3xl mb-2">🌾</div>
            <h3 className="text-cyan-300 font-semibold mb-2 text-sm sm:text-base">Hrană Naturală</h3>
            <p className="text-gray-300 text-xs sm:text-sm">Agricultura durabilă și ecosisteme sănătoase</p>
          </div>
          <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-cyan-300 border-opacity-20 rounded-lg p-4 sm:p-5 md:p-6 text-center hover:bg-opacity-10 transition">
            <div className="text-2xl sm:text-3xl mb-2">⚡</div>
            <h3 className="text-cyan-300 font-semibold mb-2 text-sm sm:text-base">Energie Curată</h3>
            <p className="text-gray-300 text-xs sm:text-sm">Surse regenerabile pentru viitorul sustenabil</p>
          </div>
        </div>

        {/* Statistics - Responsive grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 md:gap-8 mb-8 sm:mb-10 md:mb-12 text-center w-full max-w-2xl px-2">
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-cyan-300">{stats.citizens}</p>
            <p className="text-gray-400 text-xs sm:text-sm md:text-base leading-tight">Cetățeni Activi</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-cyan-300">{stats.landArea}</p>
            <p className="text-gray-400 text-xs sm:text-sm md:text-base leading-tight">Teren Protejat</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-cyan-300">{stats.funds}</p>
            <p className="text-gray-400 text-xs sm:text-sm md:text-base leading-tight">Fonduri Colectate</p>
          </div>
        </div>

        {/* CTA Buttons - Stack on mobile */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 w-full max-w-md px-2">
          <Link
            href="/auth/register"
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105 text-sm sm:text-base text-center"
          >
            Devino Cetățean
          </Link>
          <Link
            href="/marketplace"
            className="px-6 sm:px-8 py-3 sm:py-4 bg-white bg-opacity-10 backdrop-blur-sm border border-cyan-300 border-opacity-30 text-white font-semibold rounded-lg hover:bg-opacity-20 transition text-sm sm:text-base text-center"
          >
            Explore Piața
          </Link>
        </div>

        {/* Scroll indicator - Hidden on very small screens */}
        <div className="hidden sm:flex absolute bottom-6 sm:bottom-8 animate-bounce">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
