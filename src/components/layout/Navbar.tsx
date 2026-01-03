"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type ClientNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  readAt?: string;
};

function Wordmark({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={className} {...rest}>
      <span className="inline-flex items-baseline whitespace-nowrap">
        <span>IMPERIUL</span>
        <span style={{ marginLeft: "0.58em" }}>SUI</span>
        <span style={{ marginLeft: "0.20em" }}>JURIS</span>
      </span>
    </span>
  );
}

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [notifMenu, setNotifMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setNotifications([]);
        setNotifUnread(0);
        setChatUnread(0);
        return;
      }

      const res = await fetch("/api/notifications?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json?.success) return;

      const data = json.data as {
        notifications?: ClientNotification[];
        unreadCount?: number;
        chat?: { totalUnread?: number };
      };

      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setNotifUnread(Number(data.unreadCount || 0));
      setChatUnread(Number(data.chat?.totalUnread || 0));
    } catch {
      // ignore
    }
  };

  const markNotifRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationId }),
      });
      await fetchNotifications();
    } catch {
      // ignore
    }
  };

  const markAllNotifsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAll: true }),
      });
      await fetchNotifications();
    } catch {
      // ignore
    }
  };

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

    const t = setTimeout(readAuthFromStorage, 0);

    const onStorage = () => readAuthFromStorage();
    window.addEventListener("storage", onStorage);

    const onAuthChanged = () => {
      readAuthFromStorage();
      void fetchNotifications();
    };
    window.addEventListener("auth-changed", onAuthChanged as EventListener);

    return () => {
      clearTimeout(t);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged as EventListener);
    };
     
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const initial = setTimeout(() => void fetchNotifications(), 0);
    const interval = setInterval(() => void fetchNotifications(), 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
     
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-changed"));
    setIsLoggedIn(false);
    setUserMenu(false);
    setNotifMenu(false);
    setMobileMenu(false);
    router.push("/");
  };

  return (
    <nav className="bg-black bg-opacity-40 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9">
              <Image
                src="/stema.png"
                alt="Stema Imperiul Sui Juris"
                fill
                className="object-contain hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="hidden sm:inline whitespace-nowrap">
              <span
                className="relative inline-block font-bold uppercase tracking-[0.22em] text-sm sm:text-lg leading-none"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                <Wordmark
                  className="pointer-events-none select-none absolute inset-0 text-red-500/30 blur-[1.75px] translate-x-[-1px] translate-y-[1px]"
                  aria-hidden="true"
                />
                <Wordmark
                  className="pointer-events-none select-none absolute inset-0 text-yellow-400/22 blur-[1.75px] translate-y-[1px]"
                  aria-hidden="true"
                />
                <Wordmark
                  className="pointer-events-none select-none absolute inset-0 text-blue-500/30 blur-[1.75px] translate-x-[1px] translate-y-[1px]"
                  aria-hidden="true"
                />
                <Wordmark className="relative text-white group-hover:text-blue-200 transition" />
              </span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link href="/marketplace" className="text-gray-300 hover:text-white transition duration-200 text-xs font-semibold uppercase tracking-[0.18em]">
              Piață
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition duration-200 text-xs font-semibold uppercase tracking-[0.18em]">
              Despre
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition duration-200 text-xs font-semibold uppercase tracking-[0.18em]">
                  Dashboard
                </Link>
                <Link href="/help" className="text-gray-300 hover:text-white transition duration-200 text-xs font-semibold uppercase tracking-[0.18em]">
                  Ajutor
                </Link>
                <Link href="/chat" className="text-gray-300 hover:text-white transition duration-200 text-xs font-semibold uppercase tracking-[0.18em]">
                  Chat
                </Link>
              </>
            ) : null}
          </div>

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
              <div className="relative flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotifMenu(!notifMenu);
                      setUserMenu(false);
                      void fetchNotifications();
                    }}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full transition"
                    title="Notificări"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
                      />
                    </svg>
                  </button>
                  {notifUnread + chatUnread > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] leading-[18px] text-center">
                      {Math.min(99, notifUnread + chatUnread)}
                    </span>
                  ) : null}

                  {notifMenu ? (
                    <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                        <div className="text-sm text-white font-medium">Notificări</div>
                        <button
                          onClick={() => void markAllNotifsRead()}
                          className="text-xs text-gray-300 hover:text-white"
                        >
                          Marchează ca citite
                        </button>
                      </div>

                      <div className="max-h-80 overflow-auto">
                        {chatUnread > 0 ? (
                          <Link
                            href="/chat"
                            onClick={() => setNotifMenu(false)}
                            className="block px-3 py-2 hover:bg-slate-700"
                          >
                            <div className="text-sm text-white">Mesaje</div>
                            <div className="text-xs text-gray-300">Ai {chatUnread} mesaje necitite</div>
                          </Link>
                        ) : null}

                        {notifications.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-gray-300">Nicio notificare</div>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              href={n.href || "#"}
                              onClick={(e) => {
                                if (!n.href) e.preventDefault();
                                setNotifMenu(false);
                                if (!n.readAt) void markNotifRead(n.id);
                              }}
                              className="block px-3 py-2 hover:bg-slate-700"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm text-white truncate">{n.title}</div>
                                  <div className="text-xs text-gray-300 break-words overflow-hidden">{n.body}</div>
                                  <div className="text-[11px] text-gray-400 mt-1">
                                    {new Date(n.createdAt).toLocaleString("ro-RO")}
                                  </div>
                                </div>
                                {!n.readAt ? (
                                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                                ) : null}
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    onClick={() => {
                      setUserMenu(!userMenu);
                      setNotifMenu(false);
                    }}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition group"
                    title={userName || "Profil"}
                  >
                    {userName && userName.length > 0 ? userName.charAt(0).toUpperCase() : "U"}
                  </button>
                  {userMenu ? (
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
                      {isAdmin ? (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                        >
                          🛡️ Admin
                        </Link>
                      ) : null}
                      <hr className="my-2 border-slate-700" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                      >
                        🚪 Ieșire
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

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

        {mobileMenu ? (
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
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded"
                  onClick={() => setMobileMenu(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/help"
                  className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded"
                  onClick={() => setMobileMenu(false)}
                >
                  Ajutor Comunitar
                </Link>
                <Link
                  href="/chat"
                  className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded"
                  onClick={() => setMobileMenu(false)}
                >
                  Chat
                </Link>
              </>
            ) : null}
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
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-700/50 rounded text-center"
                    onClick={() => setMobileMenu(false)}
                  >
                    🛡️ Admin
                  </Link>
                ) : null}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-700/50 rounded text-center"
                >
                  🚪 Ieșire
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
