"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

export default function DocumentViewPage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();
  const documentId = params?.documentId;

  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    if (!documentId) {
      setError("Document invalid");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/documents/view?documentId=${encodeURIComponent(documentId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get("content-type") || "";
        if (!res.ok) {
          if (contentType.includes("application/json")) {
            const json = await res.json();
            setError(json?.message || json?.error || "Nu s-a putut încărca documentul");
          } else {
            setError("Nu s-a putut încărca documentul");
          }
          return;
        }

        const text = await res.text();
        setHtml(text);
      } catch {
        setError("Eroare de rețea");
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId, router]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-300">Se încarcă…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-red-400">{error}</div>
        ) : (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
            <iframe
              title="Document"
              className="w-full h-[80vh] rounded-lg border border-slate-700 bg-black"
              sandbox="allow-same-origin"
              srcDoc={html}
            />
          </div>
        )}
      </div>
    </>
  );
}
