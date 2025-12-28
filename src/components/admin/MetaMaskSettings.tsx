"use client";

import { useState } from "react";

export default function AdminMetaMaskSettings() {
  const [walletAddress, setWalletAddress] = useState(
    process.env.NEXT_PUBLIC_METAMASK_WALLET || ""
  );
  const [isEnabled, setIsEnabled] = useState(!!process.env.NEXT_PUBLIC_METAMASK_WALLET);
  const [networkId, setNetworkId] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    if (!walletAddress.trim() || !walletAddress.startsWith("0x")) {
      setMessage("Te rog introdu o adresă de portofel validă (începe cu 0x)");
      return;
    }

    try {
      setIsSaving(true);
      // In production, send to secure API endpoint
      localStorage.setItem(
        "metamask_settings",
        JSON.stringify({
          walletAddress,
          isEnabled,
          networkId,
          updatedAt: new Date().toISOString(),
        })
      );
      setMessage("Setări MetaMask salvate cu succes!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Eroare la salvarea setarilor");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-900 border border-orange-700 rounded-xl p-4 text-orange-200 text-sm">
        ⚠️ <strong>Important:</strong> Utilizează doar portofelul cu acces complet pe
        rețea. Criptomonedele primite vor fi trimise direct.
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Adresă Portofel MetaMask
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Exemplu: 0x742d35Cc6634C0532925a3b844Bc7e7595f42c62
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Rețea Blockchain</label>
          <select
            value={networkId}
            onChange={(e) => setNetworkId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="1">Ethereum Mainnet (1)</option>
            <option value="56">Binance Smart Chain (56)</option>
            <option value="137">Polygon (137)</option>
            <option value="43114">Avalanche (43114)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Selectează rețeaua pe care vei primi criptomonede
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="metamask_enabled"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <label htmlFor="metamask_enabled" className="text-sm font-medium cursor-pointer">
            Activează MetaMask/Crypto Payments
          </label>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes("succes")
                ? "bg-green-900 text-green-200"
                : "bg-red-900 text-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition"
        >
          {isSaving ? "Se salvează..." : "Salvează Setări"}
        </button>
      </div>

      {/* MetaMask Integration Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-bold mb-4">Integrare MetaMask/Crypto</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            ✅ <strong>Monede Acceptate:</strong> ETH, USDT, USDC, DAI
          </p>
          <p>
            ✅ <strong>Comisii Rețea:</strong> Variabile pe rețea
          </p>
          <p>
            ✅ <strong>Plăți:</strong> Instant la confirmarea blocului
          </p>
          <p>
            ✅ <strong>Securitate:</strong> Smart contracts verificați
          </p>
          <p>
            ✅ <strong>Wallets Suportate:</strong> MetaMask, Trust Wallet, Coinbase
          </p>
        </div>
      </div>

      {/* Test Connection */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-bold mb-4">Testare Conexiune</h3>
        <button className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition w-full sm:w-auto">
          🔗 Testează Conexiune MetaMask
        </button>
      </div>
    </div>
  );
}
