"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

type VerificationDocKind = "bulletin" | "passport" | "driver_license";

type VerificationStatus = "pending" | "approved" | "rejected" | "resubmit_required";

type VerificationRequestDto = {
  id: string;
  docKind: VerificationDocKind;
  status: VerificationStatus;
  adminNote?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function statusLabel(status: VerificationStatus) {
  if (status === "pending") return "În așteptare";
  if (status === "approved") return "Aprobat";
  if (status === "rejected") return "Respins";
  return "Necesită reîncărcare";
}

export default function VerificationPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [ok, setOk] = useState<string>("");

  const [current, setCurrent] = useState<VerificationRequestDto | null>(null);

  const [docKind, setDocKind] = useState<VerificationDocKind>("bulletin");
  const [legalFullName, setLegalFullName] = useState("");
  const [country, setCountry] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [selfie, setSelfie] = useState<File | null>(null);

  const canSubmit = useMemo(() => {
    if (!token) return false;
    if (!legalFullName.trim()) return false;
    if (!country.trim()) return false;
    if (!birthDate.trim()) return false;
    if (!city.trim()) return false;
    if (!address.trim()) return false;
    if (!documents.length) return false;
    if (!selfie) return false;
    if (current?.status === "pending") return false;
    return true;
  }, [token, legalFullName, country, birthDate, city, address, documents.length, selfie, current?.status]);

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    if (!t) {
      router.push("/auth/login");
      return;
    }
    setToken(t);
  }, [router]);

  const load = async (t: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/verification", { headers: { Authorization: `Bearer ${t}` } });
      const json = await res.json();
      if (json?.success) {
        setCurrent((json.data?.request as VerificationRequestDto) || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void load(token);
     
  }, [token]);

  const submit = async () => {
    if (!token) return;
    setError("");
    setOk("");

    if (!documents.length || !selfie) {
      setError("Încarcă documentele și selfie-ul");
      return;
    }

    if (!legalFullName.trim() || !country.trim() || !birthDate.trim() || !city.trim() || !address.trim()) {
      setError("Completează toate câmpurile de identitate");
      return;
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.set("docKind", docKind);
      form.set("legalFullName", legalFullName);
      form.set("country", country);
      form.set("birthDate", birthDate);
      form.set("city", city);
      form.set("address", address);
      documents.slice(0, 3).forEach((f) => form.append("documents", f));
      form.set("selfie", selfie);

      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.error || json?.message || "Eroare");
        return;
      }

      setOk("Cerere trimisă");
      setDocuments([]);
      setSelfie(null);
      await load(token);
      setTimeout(() => setOk(""), 2500);
    } catch {
      setError("Eroare la trimitere");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
          <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Verificare cont</h1>
              <button
                onClick={() => router.push("/profile")}
                className="text-sm px-3 py-2 rounded-lg border bg-black/20 border-white/10 text-gray-200 hover:bg-white/5"
              >
                Înapoi
              </button>
            </div>

            <p className="text-sm text-gray-300 mt-2">
              Trimite buletin/permis/pașaport + selfie. Cererea va fi revizuită de admin.
            </p>

            {loading ? (
              <div className="mt-6 text-gray-400">Se încarcă...</div>
            ) : (
              <div className="mt-6 space-y-4">
                {current ? (
                  <div className="p-4 rounded-xl border border-slate-700 bg-black/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-gray-200">
                        Status: <span className="font-semibold">{statusLabel(current.status)}</span>
                      </div>
                      <div className="text-xs text-gray-400">{new Date(current.createdAt).toLocaleString("ro-RO")}</div>
                    </div>
                    {current.adminNote ? (
                      <div className="mt-2 text-sm text-gray-300">Notă admin: {current.adminNote}</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">Nu ai trimis încă o cerere.</div>
                )}

                {error ? (
                  <div className="px-4 py-3 text-sm border border-red-800 rounded-lg bg-red-900/40 text-red-200">{error}</div>
                ) : null}
                {ok ? (
                  <div className="px-4 py-3 text-sm border border-green-800 rounded-lg bg-green-900/40 text-green-200">{ok}</div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="text-sm text-gray-200">
                    Nume complet (legal)
                    <input
                      value={legalFullName}
                      onChange={(e) => setLegalFullName(e.target.value)}
                      className="mt-2 w-full bg-slate-950/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                      placeholder="Nume Prenume"
                    />
                  </label>

                  <label className="text-sm text-gray-200">
                    Țara
                    <input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="mt-2 w-full bg-slate-950/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                      placeholder="România"
                    />
                  </label>

                  <label className="text-sm text-gray-200">
                    Data nașterii
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="mt-2 w-full bg-slate-950/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                    />
                  </label>

                  <label className="text-sm text-gray-200">
                    Oraș
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-2 w-full bg-slate-950/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                      placeholder="București"
                    />
                  </label>

                  <label className="text-sm text-gray-200 sm:col-span-2">
                    Adresă
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-2 w-full bg-slate-950/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                      placeholder="Strada, număr, bloc, etc."
                    />
                  </label>

                  <label className="text-sm text-gray-200">
                    Tip document
                    <select
                      value={docKind}
                      onChange={(e) => setDocKind(e.target.value as VerificationDocKind)}
                      className="mt-2 w-full bg-slate-950/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                    >
                      <option value="bulletin">Buletin</option>
                      <option value="driver_license">Permis</option>
                      <option value="passport">Pașaport</option>
                    </select>
                  </label>

                  <label className="text-sm text-gray-200">
                    Selfie (imagine)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                      className="mt-2 w-full text-sm text-gray-200"
                    />
                  </label>
                </div>

                <label className="text-sm text-gray-200">
                  Documente (imagini sau PDF, max 3)
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                    className="mt-2 w-full text-sm text-gray-200"
                  />
                </label>

                <button
                  onClick={() => void submit()}
                  disabled={!canSubmit || submitting}
                  className="w-full mt-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold transition"
                >
                  {submitting ? "Se trimite..." : current?.status === "pending" ? "Ai deja o cerere în așteptare" : "Trimite cerere"}
                </button>

                <div className="text-xs text-gray-400">
                  Notă: Fișierele sunt stocate pe server (în această versiune) ca Data URL; în producție e recomandat storage dedicat.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
