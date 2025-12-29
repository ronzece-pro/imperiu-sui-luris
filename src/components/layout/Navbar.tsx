"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const readAuthFromStorage = () => {
      try {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        if (token && user) {
          let display = "U";
          let admin = false;
          try {
            const userData: unknown = JSON.parse(user);
            if (userData && typeof userData === "object") {
              const u = userData as { fullName?: unknown; username?: unknown; email?: unknown; role?: unknown };
              const candidate =
                (typeof u.fullName === "string" && u.fullName) ||
                (typeof u.username === "string" && u.username) ||
                (typeof u.email === "string" && u.email) ||
                "U";
              display = candidate;
              admin = u.role === "admin";
            }
          } catch {
            display = "U";
          }

          setIsLoggedIn(true);
          setUserName(display && display.length > 0 ? display : "U");
          setIsAdmin(admin);
        } else {
          setIsLoggedIn(false);
          setUserName("U");
          setIsAdmin(false);
        }
      } catch {
        setIsLoggedIn(false);
        setUserName("U");
        setIsAdmin(false);
      }
    };

    // Defer state update to avoid setState-in-effect lint rule
    const t = setTimeout(readAuthFromStorage, 0);

    const onStorage = () => {
      readAuthFromStorage();
    };
    window.addEventListener("storage", onStorage);

    const onAuthChanged = () => {
      readAuthFromStorage();
    };
    window.addEventListener("auth-changed", onAuthChanged as EventListener);

    return () => {
      clearTimeout(t);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged as EventListener);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-changed"));
    setIsLoggedIn(false);
    setUserMenu(false);
    setMobileMenu(false);
    router.push("/");
  };

  return (
    <nav className="bg-black bg-opacity-40 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8">
              <Image
                src="/stema.png"
                alt="Stema Imperiul Sui Luris"
                fill
                className="object-contain hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="text-white font-bold text-sm sm:text-lg hidden sm:inline group-hover:text-blue-400 transition whitespace-nowrap">
              Imperiul Sui Luris
            </span>
          </Link>

          {/* Menu Items - Desktop */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link href="/marketplace" className="text-gray-300 hover:text-white transition duration-200 text-sm">
              Piață
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition duration-200 text-sm">
              Despre
            </Link>
            {isLoggedIn && (
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition duration-200 text-sm">
                Dashboard
              </Link>
            )}
            {isLoggedIn && (
              <Link href="/chat" className="text-gray-300 hover:text-white transition duration-200 text-sm">
                Chat
              </Link>
            )}
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/auth/login"
                  className="px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium text-gray-300 hover:text-white transition"
                >
                  Autentificare
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Înregistrare
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition group"
                  title={userName || "Profil"}
                >
                  {(userName && userName.length > 0) ? userName.charAt(0).toUpperCase() : "U"}
                </button>
                {userMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-2 z-50">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                    >
                      📊 Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                    >
                      👤 Profilul meu
                    </Link>
                    <Link
                      href="/verification"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                    >
                      ✅ Verificare
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                      >
                        🛡️ Admin
                      </Link>
                    )}
                    <hr className="my-2 border-slate-700" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                    >
                      🚪 Ieșire
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-slate-700 py-3 space-y-3">
            <Link
              href="/marketplace"
              className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded"
              onClick={() => setMobileMenu(false)}
            >
              Piață
            </Link>
            <Link
              href="/about"
              className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded"
              onClick={() => setMobileMenu(false)}
            >
              Despre
            </Link>
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded"
                onClick={() => setMobileMenu(false)}
              >
                Dashboard
              </Link>
            )}
            {isLoggedIn && (
              <Link
                href="/chat"
                className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded"
                onClick={() => setMobileMenu(false)}
              >
                Chat
              </Link>
            )}
            <hr className="border-slate-700" />
            {!isLoggedIn ? (
              <div className="space-y-2 px-4">
                <Link
                  href="/auth/login"
                  className="block px-4 py-2 text-sm text-gray-300 hover:text-white text-center"
                  onClick={() => setMobileMenu(false)}
                >
                  Autentificare
                </Link>
                <Link
                  href="/auth/register"
                  className="block px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded text-center"
                  onClick={() => setMobileMenu(false)}
                >
                  Înregistrare
                </Link>
              </div>
            ) : (
              <div className="space-y-2 px-4">
                <div className="py-2 text-center">
                  <p className="text-sm text-gray-300">👤 {userName}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded text-center"
                  onClick={() => setMobileMenu(false)}
                >
                  📊 Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded text-center"
                  onClick={() => setMobileMenu(false)}
                >
                  👤 Profilul meu
                </Link>
                <Link
                  href="/verification"
                  className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded text-center"
                  onClick={() => setMobileMenu(false)}
                >
                  ✅ Verificare
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded text-center"
                    onClick={() => setMobileMenu(false)}
                  >
                    🛡️ Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-700/50 rounded text-center"
                >
                  🚪 Ieșire
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
