"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/layout/Navbar";

type AboutContent = {
  title?: string;
  subtitle?: string;
  markdown?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  fileUrls?: string[];
  updatedAt?: string;
};

function toLines(input: string): string[] {
  return input
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.replace("/", "") || null;
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

export default function AboutPage() {
  const [loading, setLoading] = useState(true);
  const [about, setAbout] = useState<AboutContent | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/pages/about", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!json?.success) {
          setAbout(null);
          return;
        }
        setAbout((json.data?.about || null) as AboutContent | null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const markdownLines = useMemo(() => toLines(about?.markdown || ""), [about?.markdown]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="bg-white/5 backdrop-blur-lg border border-slate-700 rounded-2xl p-6 sm:p-10">
            {loading ? (
              <div className="text-gray-400">Se încarcă...</div>
            ) : !about ? (
              <div className="text-gray-400">Conținut indisponibil.</div>
            ) : (
              <>
                <h1
                  className="text-2xl sm:text-4xl font-bold text-white tracking-[0.08em]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  {about.title || "Despre"}
                </h1>
                {about.subtitle ? <p className="text-gray-300 mt-2">{about.subtitle}</p> : null}
                {about.updatedAt ? (
                  <p className="text-xs text-gray-500 mt-2">Actualizat: {new Date(about.updatedAt).toLocaleString("ro-RO")}</p>
                ) : null}

                {markdownLines.length ? (
                  <div className="mt-6 space-y-3 text-gray-200 text-sm sm:text-base">
                    {markdownLines.map((line, idx) => (
                      <p key={idx} className="leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}

                {Array.isArray(about.imageUrls) && about.imageUrls.length ? (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-white mb-3">Imagini</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {about.imageUrls.map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-slate-900/40 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="Imagine" className="w-full h-56 object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {Array.isArray(about.videoUrls) && about.videoUrls.length ? (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-white mb-3">Video</h2>
                    <div className="space-y-4">
                      {about.videoUrls.map((u) => {
                        const yt = extractYouTubeId(u);
                        if (yt) {
                          return (
                            <div key={u} className="bg-slate-900/40 border border-slate-700 rounded-xl overflow-hidden">
                              <div className="aspect-video">
                                <iframe
                                  className="w-full h-full"
                                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`}
                                  title="YouTube video"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          );
                        }

                        const isMp4 = u.toLowerCase().endsWith(".mp4") || u.toLowerCase().includes(".mp4?");
                        if (isMp4) {
                          return (
                            <div key={u} className="bg-slate-900/40 border border-slate-700 rounded-xl overflow-hidden p-3">
                              <video src={u} controls className="w-full rounded-lg" />
                            </div>
                          );
                        }

                        return (
                          <a
                            key={u}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="block px-4 py-3 bg-slate-900/40 border border-slate-700 rounded-xl text-gray-200 hover:border-slate-500 transition"
                          >
                            {u}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {Array.isArray(about.fileUrls) && about.fileUrls.length ? (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-white mb-3">Fișiere</h2>
                    <div className="space-y-2">
                      {about.fileUrls.map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-4 py-3 bg-slate-900/40 border border-slate-700 rounded-xl text-gray-200 hover:border-slate-500 transition"
                        >
                          {u}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
