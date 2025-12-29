"use client";

import { useEffect, useMemo, useState } from "react";

type AboutContent = {
  title: string;
  subtitle: string;
  markdown: string;
  imageUrls: string[];
  videoUrls: string[];
  fileUrls: string[];
  updatedAt?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

function splitLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AdminAboutPageSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [imageUrlsRaw, setImageUrlsRaw] = useState("");
  const [videoUrlsRaw, setVideoUrlsRaw] = useState("");
  const [fileUrlsRaw, setFileUrlsRaw] = useState("");

  const payload = useMemo(() => {
    return {
      title,
      subtitle,
      markdown,
      imageUrls: splitLines(imageUrlsRaw),
      videoUrls: splitLines(videoUrlsRaw),
      fileUrls: splitLines(fileUrlsRaw),
    };
  }, [title, subtitle, markdown, imageUrlsRaw, videoUrlsRaw, fileUrlsRaw]);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Nu ești autentificat");
        return;
      }

      const res = await fetch("/api/admin/pages/about", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<{ about?: AboutContent }> | null;
      if (!res.ok || !json?.success) {
        setMessage(json?.error || "Eroare la încărcare");
        return;
      }

      const about = json.data?.about || null;
      if (!about) {
        setMessage("Conținut inexistent");
        return;
      }

      setTitle(about.title || "");
      setSubtitle(about.subtitle || "");
      setMarkdown(about.markdown || "");
      setImageUrlsRaw(Array.isArray(about.imageUrls) ? about.imageUrls.join("\n") : "");
      setVideoUrlsRaw(Array.isArray(about.videoUrls) ? about.videoUrls.join("\n") : "");
      setFileUrlsRaw(Array.isArray(about.fileUrls) ? about.fileUrls.join("\n") : "");
    } catch {
      setMessage("Eroare la încărcare");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      setMessage("");
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Nu ești autentificat");
        return;
      }

      const res = await fetch("/api/admin/pages/about", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as ApiResponse<{ about?: AboutContent }> | null;
      if (!res.ok || !json?.success) {
        setMessage(json?.error || "Eroare la salvare");
        return;
      }

      setMessage("Salvat");
      setTimeout(() => setMessage(""), 2500);
      await load();
    } catch {
      setMessage("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Despre</h2>
            <p className="text-xs text-gray-400 mt-1">Pagina publică: /about</p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading || saving}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 rounded-lg text-sm font-medium transition"
          >
            Reîncarcă
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Titlu</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subtitlu</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Text (linii, simplu)</label>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={10}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-2">Deocamdată se afișează pe linii (nu render complet Markdown).</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL imagini (una pe linie)</label>
            <textarea
              value={imageUrlsRaw}
              onChange={(e) => setImageUrlsRaw(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL video (una pe linie)</label>
            <textarea
              value={videoUrlsRaw}
              onChange={(e) => setVideoUrlsRaw(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-2">YouTube link → embed; .mp4 → player; altfel link.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL fișiere (una pe linie)</label>
            <textarea
              value={fileUrlsRaw}
              onChange={(e) => setFileUrlsRaw(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-2">Poți pune link-uri către PDF.</p>
          </div>

          {message ? (
            <div
              className={`p-3 rounded-lg text-sm ${
                message === "Salvat" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
              }`}
            >
              {message}
            </div>
          ) : null}

          <button
            onClick={() => void save()}
            disabled={loading || saving}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition"
          >
            {saving ? "Se salvează..." : "Salvează"}
          </button>
        </div>
      </div>
    </div>
  );
}
