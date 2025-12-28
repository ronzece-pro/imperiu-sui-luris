"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUserMenu(false);
    router.push("/");
  };

  return (
    <nav className="bg-black bg-opacity-40 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              ISL
            </div>
            <span className="text-white font-bold text-lg hidden sm:inline group-hover:text-blue-400 transition">
              Imperiul Sui Luris
            </span>
          </Link>

          {/* Menu Items */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/marketplace" className="text-gray-300 hover:text-white transition duration-200">
              Piață
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition duration-200">
              Despre
            </Link>
            {isLoggedIn && (
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition duration-200">
                Dashboard
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-3">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition"
                >
                  Autentificare
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Înregistrare
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Profil
                </button>
                {userMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-2">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white"
                    >
                      Profilul meu
                    </Link>
                    <hr className="my-2 border-slate-700" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white"
                    >
                      Ieșire
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
