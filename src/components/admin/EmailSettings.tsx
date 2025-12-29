"use client";

import { useEffect, useState } from "react";

type EmailSettingsResponse = {
  emailSettings: {
    provider: "resend";
    resendApiKeyMasked: string;
    emailFrom: string;
    enabled: boolean;
    updatedAt?: string;
  };
};

export default function AdminEmailSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [enabled, setEnabled] = useState(false);
  const [emailFrom, setEmailFrom] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [masked, setMasked] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Nu ești autentificat");
        return;
      }

      const res = await fetch("/api/admin/email", { headers: { Authorization: `Bearer ${token}` } });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.success) {
        setMessage(json?.error || "Eroare la încărcare");
        return;
      }

      const data = json.data as EmailSettingsResponse;
      setEnabled(Boolean(data.emailSettings.enabled));
      setEmailFrom(data.emailSettings.emailFrom || "");
      setMasked(data.emailSettings.resendApiKeyMasked || "");
    } catch {
      setMessage("Eroare la încărcare");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage("");

      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Nu ești autentificat");
        return;
      }

      const payload: any = {
        enabled,
        emailFrom,
      };
      // Only send key if admin typed one.
      if (resendApiKey.trim()) payload.resendApiKey = resendApiKey.trim();

      const res = await fetch("/api/admin/email", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.success) {
        setMessage(json?.error || "Eroare la salvare");
        return;
      }

      setResendApiKey("");
      setMessage("Setări email salvate");
      void load();
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Eroare la salvare");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-900 border border-yellow-700 rounded-xl p-4 text-yellow-200 text-sm">
        ⚠️ <strong>Important:</strong> Cheile de email sunt secrete. Dacă o cheie ajunge public, e recomandat să fie
        rotită.
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="email_enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
            disabled={isLoading}
          />
          <label htmlFor="email_enabled" className="text-sm font-medium cursor-pointer">
            Activează trimiterea de email
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">EMAIL_FROM</label>
          <input
            type="text"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            placeholder='Imperiu <no-reply@domeniul-tau.ro>'
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-400 mt-1">Ex: Imperiu &lt;no-reply@domeniu.ro&gt; (domeniu verificat în Resend)</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">RESEND_API_KEY</label>
          <input
            type="password"
            value={resendApiKey}
            onChange={(e) => setResendApiKey(e.target.value)}
            placeholder={masked ? `salvat (${masked})` : "re_..."}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-400 mt-1">Lasă gol ca să păstrezi cheia existentă.</p>
        </div>

        {message ? (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes("salvat") || message.includes("Salvate") || message.includes("Setări")
                ? "bg-green-900 text-green-200"
                : "bg-red-900 text-red-200"
            }`}
          >
            {message}
          </div>
        ) : null}

        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition"
        >
          {isSaving ? "Se salvează..." : "Salvează"}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-bold mb-2">Provider</h3>
        <p className="text-sm text-gray-300">Resend (API simplu, bun pentru început)</p>
      </div>
    </div>
  );
}
