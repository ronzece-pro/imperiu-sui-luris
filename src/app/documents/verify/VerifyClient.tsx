"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerifyResult =
  | {
      ok: true;
      document: {
        id: string;
        documentNumber: string;
        type: string;
        status: string;
        issueDate?: string;
        expiryDate?: string;
      };
      disclaimer?: string;
    }
  | { ok: false; error: string };

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const initialDocumentId = searchParams.get("documentId") || "";
  const initialDocumentNumber = searchParams.get("documentNumber") || "";
  const initialCode = searchParams.get("code") || "";

  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [documentNumber, setDocumentNumber] = useState(initialDocumentNumber);
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const canSubmit = useMemo(() => {
    return code.trim().length > 0 && (documentId.trim().length > 0 || documentNumber.trim().length > 0);
  }, [code, documentId, documentNumber]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setResult(null);
    try {
      const qs = new URLSearchParams();
      if (documentId.trim()) qs.set("documentId", documentId.trim());
      if (documentNumber.trim()) qs.set("documentNumber", documentNumber.trim());
      qs.set("code", code.trim());

      const res = await fetch(`/api/documents/verify?${qs.toString()}`);
      const json = await res.json();

      if (!res.ok || json?.success === false) {
        setResult({ ok: false, error: json?.message || "Verificarea a eșuat." });
        return;
      }

      setResult({
        ok: true,
        document: {
          id: json.data?.document?.id,
          documentNumber: json.data?.document?.documentNumber,
          type: json.data?.document?.type,
          status: json.data?.document?.status,
          issueDate: json.data?.document?.issueDate,
          expiryDate: json.data?.document?.expiryDate,
        },
        disclaimer: json.data?.disclaimer,
      });
    } catch {
      setResult({ ok: false, error: "Eroare de rețea." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white">Verificare document</h1>
        <p className="text-sm text-gray-400 mt-2">Introdu documentId sau documentNumber împreună cu codul de verificare.</p>

        <form onSubmit={onVerify} className="mt-6 bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300">Document ID</label>
              <input
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white"
                placeholder="doc_..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300">Document Number</label>
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white"
                placeholder="ISL-..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300">Cod verificare</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white"
                placeholder="ABCD-EFGH"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="mt-4 px-4 py-2 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
          >
            {loading ? "Verific…" : "Verifică"}
          </button>
        </form>

        {result && (
          <div className="mt-6 bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            {result.ok ? (
              <div>
                <div className="text-cyan-300 font-semibold">Verificat</div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-white/10 p-3">
                    <div className="text-gray-400">Nr.</div>
                    <div className="font-semibold text-white">{result.document.documentNumber}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <div className="text-gray-400">Tip</div>
                    <div className="font-semibold text-white">{result.document.type}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <div className="text-gray-400">Statut</div>
                    <div className="font-semibold text-white">{result.document.status}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 p-3">
                    <div className="text-gray-400">Document ID</div>
                    <div className="font-semibold text-white">{result.document.id}</div>
                  </div>
                </div>
                {result.disclaimer && <div className="mt-4 text-xs text-gray-400">{result.disclaimer}</div>}
              </div>
            ) : (
              <div>
                <div className="text-red-400 font-semibold">Nevalid</div>
                <div className="mt-2 text-sm text-gray-300">{result.error}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
