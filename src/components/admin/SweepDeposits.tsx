"use client";

import { useState } from "react";

export default function AdminSweepDeposits() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [hotWallet, setHotWallet] = useState("");
  const [result, setResult] = useState<any>(null);
  const [chains, setChains] = useState(["polygon", "bsc"]);
  const [tokens, setTokens] = useState(["usdt", "usdc"]);
  const [minAmount, setMinAmount] = useState(1);

  const handleSweep = async () => {
    if (!hotWallet || !hotWallet.startsWith("0x")) {
      setMessage("❌ Introdu o adresă validă de hot wallet (0x...)");
      return;
    }

    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/sweep-deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hotWallet,
          chains,
          tokens,
          minAmount,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error("Sweep error:", error);
      setMessage("❌ Eroare la sweep");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          💰 Sweep Deposits (HD Wallet)
        </h2>
        <p className="text-slate-300 text-sm">
          Colectează automat toate depozitele USDT/USDC de la useri și mută-le în hot wallet-ul principal.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.startsWith("✅")
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* Configuration */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <h3 className="text-white font-bold text-lg">⚙️ Configurație Sweep</h3>

        {/* Hot Wallet Address */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Hot Wallet Address (destinație)
          </label>
          <input
            type="text"
            value={hotWallet}
            onChange={(e) => setHotWallet(e.target.value)}
            placeholder="0x..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Toate fondurile colectate vor fi transferate la această adresă
          </p>
        </div>

        {/* Chains */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Rețele (chains)
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chains.includes("polygon")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setChains([...chains, "polygon"]);
                  } else {
                    setChains(chains.filter((c) => c !== "polygon"));
                  }
                }}
                className="accent-cyan-500"
              />
              <span className="text-white text-sm">🟣 Polygon</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chains.includes("bsc")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setChains([...chains, "bsc"]);
                  } else {
                    setChains(chains.filter((c) => c !== "bsc"));
                  }
                }}
                className="accent-cyan-500"
              />
              <span className="text-white text-sm">🟡 BSC</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chains.includes("ethereum")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setChains([...chains, "ethereum"]);
                  } else {
                    setChains(chains.filter((c) => c !== "ethereum"));
                  }
                }}
                className="accent-cyan-500"
              />
              <span className="text-white text-sm">⚪ Ethereum</span>
            </label>
          </div>
        </div>

        {/* Tokens */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Token-uri
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={tokens.includes("usdt")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setTokens([...tokens, "usdt"]);
                  } else {
                    setTokens(tokens.filter((t) => t !== "usdt"));
                  }
                }}
                className="accent-cyan-500"
              />
              <span className="text-white text-sm">💵 USDT</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={tokens.includes("usdc")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setTokens([...tokens, "usdc"]);
                  } else {
                    setTokens(tokens.filter((t) => t !== "usdc"));
                  }
                }}
                className="accent-cyan-500"
              />
              <span className="text-white text-sm">💵 USDC</span>
            </label>
          </div>
        </div>

        {/* Min Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Sumă minimă pentru sweep (USD)
          </label>
          <input
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(parseFloat(e.target.value) || 1)}
            min="0.01"
            step="0.01"
            className="w-32 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Doar adresele cu balanță mai mare vor fi sweep-uite
          </p>
        </div>

        {/* Sweep Button */}
        <button
          onClick={handleSweep}
          disabled={loading || !hotWallet}
          className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold rounded-lg transition disabled:cursor-not-allowed text-lg"
        >
          {loading ? "🔄 Se procesează sweep..." : "💰 Rulează Sweep Acum"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-bold text-lg">📊 Rezultate Sweep</h3>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <p className="text-green-400 text-2xl font-bold">{result.summary.successful}</p>
              <p className="text-slate-400 text-sm">Succes</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-red-400 text-2xl font-bold">{result.summary.failed}</p>
              <p className="text-slate-400 text-sm">Erori</p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 text-center">
              <p className="text-cyan-400 text-2xl font-bold">{result.summary.totalAmount}</p>
              <p className="text-slate-400 text-sm">Total Colectat</p>
            </div>
          </div>

          {/* Successful Sweeps */}
          {result.sweeps.length > 0 && (
            <div>
              <h4 className="text-white font-semibold mb-2">✅ Transferuri Reușite</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.sweeps.map((sweep: any, idx: number) => (
                  <div key={idx} className="bg-slate-900 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">
                          {sweep.amount} {sweep.token} ({sweep.chain})
                        </p>
                        <p className="text-slate-400 text-xs">User: {sweep.userId}</p>
                      </div>
                      <a
                        href={`https://${sweep.chain === "polygon" ? "polygonscan" : sweep.chain === "bsc" ? "bscscan" : "etherscan"}.com/tx/${sweep.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 text-xs"
                      >
                        View TX →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <h4 className="text-red-400 font-semibold mb-2">❌ Erori</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((err: any, idx: number) => (
                  <div key={idx} className="bg-red-500/10 rounded p-2 text-xs text-red-300">
                    {err.userId}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          ℹ️ <strong>Cum funcționează:</strong> Sweep-ul colectează automat toate depozitele USDT/USDC
          de la adresele HD ale userilor și le transferă în hot wallet-ul tău principal. Fiecare user
          păstrează LURIS-ul creditat anterior. Recomand rulare zilnică sau când total deposits {">"} $100.
        </p>
      </div>
    </div>
  );
}
