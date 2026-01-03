"use client";

import { useState, useEffect } from "react";

interface ChainInfo {
  name: string;
  chainId: number;
  rpc: string;
  explorer: string;
  faucet: string | null;
}

interface UserAddress {
  userId: string;
  email: string;
  depositAddress: string;
  derivationPath: string;
  index: number;
}

interface WalletStatus {
  system: {
    isTestnet: boolean;
    networkMode: string;
    hasMasterSeed: boolean;
    hotWallet: string;
    hotWalletBalances: {
      polygon: { usdt: number; usdc: number; matic: number };
    } | null;
    cronSecret: string;
  };
  chains: {
    polygon: ChainInfo;
    bsc: ChainInfo;
  };
  userAddresses: UserAddress[];
  totalUsers: number;
  instructions: { ro: string };
}

interface UserBalances {
  userId: string;
  depositAddress: string;
  balances: {
    polygon: { usdt: number; usdc: number; matic: number; explorer: string };
    bsc: { usdt: number; usdc: number; bnb: number; explorer: string };
  };
  totalUSD: number;
  isTestnet: boolean;
}

export default function AdminWalletStatus() {
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userBalances, setUserBalances] = useState<UserBalances | null>(null);
  const [checkingBalances, setCheckingBalances] = useState(false);
  const [triggeringCheck, setTriggeringCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/wallet-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error || "Failed to load wallet status");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const checkUserBalances = async (userId: string) => {
    try {
      setCheckingBalances(true);
      setSelectedUser(userId);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/wallet-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setUserBalances(data.data);
      }
    } catch (e) {
      console.error("Error checking balances:", e);
    } finally {
      setCheckingBalances(false);
    }
  };

  const triggerDepositCheck = async () => {
    try {
      setTriggeringCheck(true);
      setCheckResult(null);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/cron/check-deposits", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCheckResult(`✅ Verificare completă: ${data.data.depositsDetected} depozite noi, ${data.data.totalLurisCredited} LURIS creditați`);
      } else {
        setCheckResult(`❌ Eroare: ${data.error}`);
      }
    } catch (e) {
      setCheckResult("❌ Network error");
    } finally {
      setTriggeringCheck(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">🔄 Se încarcă...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400">{error}</p>
        <button onClick={loadStatus} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg">
          Reîncearcă
        </button>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${status.system.isTestnet ? "bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-500/30" : "bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30"} border rounded-xl p-6`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🔐 HD Wallet Status
              <span className={`text-sm px-3 py-1 rounded-full ${status.system.isTestnet ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                {status.system.networkMode}
              </span>
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              {status.system.isTestnet 
                ? "⚠️ Mod testnet activ - folosește tokens de test!" 
                : "🔴 Mod producție - bani reali!"}
            </p>
          </div>
          <button
            onClick={loadStatus}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Master Seed</p>
          <p className={`font-bold text-lg ${status.system.hasMasterSeed ? "text-green-400" : "text-red-400"}`}>
            {status.system.hasMasterSeed ? "✓ Configurat" : "✗ Lipsește"}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Hot Wallet</p>
          <p className="font-mono text-xs text-white truncate" title={status.system.hotWallet}>
            {status.system.hotWallet.slice(0, 10)}...{status.system.hotWallet.slice(-8)}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Cron Secret</p>
          <p className={`font-bold ${status.system.cronSecret === "Configured" ? "text-green-400" : "text-red-400"}`}>
            {status.system.cronSecret}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Utilizatori</p>
          <p className="font-bold text-2xl text-white">{status.totalUsers}</p>
        </div>
      </div>

      {/* Hot Wallet Balances */}
      {status.system.hotWalletBalances && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">💰 Hot Wallet Balances (Polygon)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-green-400">${status.system.hotWalletBalances.polygon.usdt.toFixed(2)}</p>
              <p className="text-slate-400 text-sm">USDT</p>
            </div>
            <div className="text-center p-4 bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">${status.system.hotWalletBalances.polygon.usdc.toFixed(2)}</p>
              <p className="text-slate-400 text-sm">USDC</p>
            </div>
            <div className="text-center p-4 bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">{status.system.hotWalletBalances.polygon.matic.toFixed(4)}</p>
              <p className="text-slate-400 text-sm">MATIC</p>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Check */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">🔍 Verificare Manuală Depozite</h3>
        <p className="text-slate-400 text-sm mb-4">
          Verifică toate adresele utilizatorilor pentru depozite noi și creditează LURIS automat.
        </p>
        <button
          onClick={triggerDepositCheck}
          disabled={triggeringCheck}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg font-bold transition"
        >
          {triggeringCheck ? "⏳ Se verifică..." : "🔍 Verifică Depozite Acum"}
        </button>
        {checkResult && (
          <p className={`mt-4 p-3 rounded-lg ${checkResult.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {checkResult}
          </p>
        )}
      </div>

      {/* Chain Config */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">⛓️ Rețele Configurate</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(status.chains).map(([key, chain]) => (
            <div key={key} className="bg-slate-900 rounded-lg p-4">
              <h4 className="font-bold text-white mb-2">{chain.name}</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-slate-400">Chain ID:</span> <span className="text-white">{chain.chainId}</span></p>
                <p><span className="text-slate-400">RPC:</span> <span className="text-white font-mono text-xs">{chain.rpc}</span></p>
                <div className="flex gap-2 mt-2">
                  <a href={chain.explorer} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30">
                    Explorer →
                  </a>
                  {chain.faucet && (
                    <a href={chain.faucet} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30">
                      Faucet →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Addresses */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">👥 Adrese Utilizatori ({status.userAddresses.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Adresă Depunere</th>
                <th className="pb-2 pr-4">Index</th>
                <th className="pb-2">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {status.userAddresses.map((user) => (
                <tr key={user.userId} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="py-3 pr-4 text-white">{user.email}</td>
                  <td className="py-3 pr-4">
                    <code className="text-xs text-green-400 bg-slate-900 px-2 py-1 rounded">
                      {user.depositAddress.slice(0, 10)}...{user.depositAddress.slice(-8)}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(user.depositAddress)}
                      className="ml-2 text-slate-400 hover:text-white"
                      title="Copiază"
                    >
                      📋
                    </button>
                  </td>
                  <td className="py-3 pr-4 text-slate-400">{user.index}</td>
                  <td className="py-3">
                    <button
                      onClick={() => checkUserBalances(user.userId)}
                      disabled={checkingBalances && selectedUser === user.userId}
                      className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30 disabled:opacity-50"
                    >
                      {checkingBalances && selectedUser === user.userId ? "..." : "Check Balance"}
                    </button>
                    <a
                      href={`${status.chains.polygon.explorer}/address/${user.depositAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 px-3 py-1 bg-purple-600/20 text-purple-400 rounded text-xs hover:bg-purple-600/30"
                    >
                      Explorer
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Balance Modal */}
      {userBalances && (
        <div className="bg-slate-800/50 border border-green-500/30 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-green-400">💰 Balanțe pentru {userBalances.userId}</h3>
            <button onClick={() => setUserBalances(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Adresă: <code className="text-green-400">{userBalances.depositAddress}</code>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-lg">
              <h4 className="font-bold mb-2">Polygon</h4>
              <p>USDT: <span className="text-green-400">${userBalances.balances.polygon.usdt.toFixed(2)}</span></p>
              <p>USDC: <span className="text-blue-400">${userBalances.balances.polygon.usdc.toFixed(2)}</span></p>
              <p>MATIC: <span className="text-purple-400">{userBalances.balances.polygon.matic.toFixed(4)}</span></p>
              <a href={userBalances.balances.polygon.explorer} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                Vezi în Explorer →
              </a>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <h4 className="font-bold mb-2">BSC</h4>
              <p>USDT: <span className="text-green-400">${userBalances.balances.bsc.usdt.toFixed(2)}</span></p>
              <p>USDC: <span className="text-blue-400">${userBalances.balances.bsc.usdc.toFixed(2)}</span></p>
              <p>BNB: <span className="text-yellow-400">{userBalances.balances.bsc.bnb.toFixed(4)}</span></p>
              <a href={userBalances.balances.bsc.explorer} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                Vezi în Explorer →
              </a>
            </div>
          </div>
          <p className="mt-4 text-xl font-bold">
            Total USD: <span className="text-green-400">${userBalances.totalUSD.toFixed(2)}</span>
          </p>
        </div>
      )}

      {/* Instructions */}
      {status.system.isTestnet && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-400 mb-4">📖 Instrucțiuni Testare</h3>
          <div className="prose prose-invert prose-sm max-w-none">
            <ol className="list-decimal list-inside space-y-2 text-slate-300">
              <li>Adaugă <strong>Polygon Amoy</strong> în MetaMask (vezi mai jos)</li>
              <li>Obține MATIC de test de la <a href={status.chains.polygon.faucet || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Faucet</a></li>
              <li>Copiază adresa unui user din tabelul de mai sus</li>
              <li>Trimite MATIC de test la acea adresă</li>
              <li>Apasă "Verifică Depozite Acum" pentru a credita LURIS</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
