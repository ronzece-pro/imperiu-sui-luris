"use client";

import { useState, useEffect } from "react";

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
}

type ApiTx = {
  id?: unknown;
  type?: unknown;
  amount?: unknown;
  description?: unknown;
  source?: unknown;
  status?: unknown;
  createdAt?: unknown;
};

interface Transaction {
  id: string;
  type: "purchase" | "topup" | "refund" | "sale";
  amount: number;
  description: string;
  paymentMethod: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export default function WalletPanel() {
  const [balance, setBalance] = useState(0);
  const [spent, setSpent] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "metamask" | "hdwallet">("hdwallet");
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [metamaskEnabled, setMetamaskEnabled] = useState(false);
  const [hdWalletEnabled, setHdWalletEnabled] = useState(true);
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);
  const [depositAddress, setDepositAddress] = useState("");
  const [depositInstructions, setDepositInstructions] = useState("");
  const [depositQR, setDepositQR] = useState("");

  const loadWallet = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Load payment settings
    try {
      const settingsRes = await fetch("/api/admin/payment-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        const stripeActive = settingsData.data.stripe?.adminToggle && settingsData.data.stripe?.configured;
        setStripeEnabled(stripeActive || false);
        setMetamaskEnabled(settingsData.data.metamask?.enabled || false);
        setHdWalletEnabled(settingsData.data.hdWallet?.enabled ?? true);
        
        // If current method is disabled, switch to first available
        if (paymentMethod === "stripe" && !stripeActive) {
          setPaymentMethod(settingsData.data.hdWallet?.enabled ? "hdwallet" : "metamask");
        }
        if (paymentMethod === "metamask" && !settingsData.data.metamask?.enabled) {
          setPaymentMethod(settingsData.data.hdWallet?.enabled ? "hdwallet" : "stripe");
        }
      }
    } catch (error) {
      console.error("Error loading payment settings:", error);
    }

    const res = await fetch("/api/wallet", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data?.success) return;

    const nextBalance = Number(data.data?.balance || 0);
    const txs: unknown[] = Array.isArray(data.data?.transactions) ? data.data.transactions : [];
    const mapped: Transaction[] = txs.map((raw) => {
      const tx = (raw ?? {}) as ApiTx;
      const type = (typeof tx.type === "string" ? tx.type : "topup") as Transaction["type"];
      const status = (typeof tx.status === "string" ? tx.status : "completed") as Transaction["status"];
      const source = typeof tx.source === "string" ? tx.source : "wallet";
      const description = typeof tx.description === "string" ? tx.description : source;

      return {
        id: String(tx.id ?? ""),
        type,
        amount: Number(tx.amount ?? 0),
        description: String(description || "Tranzacție"),
        paymentMethod: String(source),
        status,
        createdAt: String(tx.createdAt ?? ""),
      };
    });

    const spentTotal = mapped.filter((t) => t.type === "purchase").reduce((sum, t) => sum + t.amount, 0);

    setBalance(nextBalance);
    setTransactions(mapped);
    setSpent(spentTotal);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadWallet();
      } catch (e) {
        console.error(e);
      }
    };

    load();
  }, []);

  const remaining = balance - spent;

  const handleTopup = async () => {
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      alert("Introdu o sumă validă");
      return;
    }

    try {
      const amount = parseFloat(topupAmount);
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Te rog autentifică-te întâi");
        return;
      }

      // HD Wallet flow: show HD deposit address
      if (paymentMethod === "hdwallet") {
        const res = await fetch("/api/deposit-address-hd", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setDepositAddress(data.data.depositAddress);
          setDepositInstructions(data.data.instructions);
          setDepositQR(data.data.qrCodeUrl);
          setShowTopup(false);
          setShowBankTransferModal(true);
          return;
        } else {
          alert(`Eroare: ${data.error}`);
          return;
        }
      }

      if (paymentMethod === "stripe") {
        // Create a Stripe checkout session on the server
        const res = await fetch("/api/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "addFunds", amount, paymentMethod: "stripe" }),
        });
        const data = await res.json();
        if (data.success && data.data?.sessionUrl) {
          window.location.href = data.data.sessionUrl;
          return;
        } else {
          alert("Eroare la inițiere plata Stripe");
          return;
        }
      }

      // MetaMask flow (LURIS amount)
      const luris = Math.floor(amount);
      if (luris <= 0) {
        alert("Introdu un număr întreg de LURIS");
        return;
      }

      const eth = (window as unknown as { ethereum?: EthereumProvider })?.ethereum;
      if (!eth?.request) {
        alert("MetaMask nu este disponibil în acest browser");
        return;
      }

      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const from = accounts?.[0];
      if (!from) {
        alert("Nu am putut obține contul MetaMask");
        return;
      }

      const quoteRes = await fetch("/api/wallet", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "createMetamaskTopup", lurisAmount: luris }),
      });
      const quote = await quoteRes.json();
      if (!quote?.success) {
        alert(quote?.message || "Eroare la inițiere plata MetaMask");
        return;
      }

      const to = String(quote.data?.to || "");
      const valueWei = String(quote.data?.valueWei || "0");
      const valueHex = `0x${BigInt(valueWei).toString(16)}`;

      const sentTxHash: string = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from, to, value: valueHex }],
      });

      const confirmRes = await fetch("/api/wallet", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "confirmMetamaskTopup", lurisAmount: luris, txHash: sentTxHash }),
      });
      const confirm = await confirmRes.json();
      if (!confirm?.success) {
        alert(confirm?.message || "Tranzacție trimisă, dar nu a putut fi confirmată încă");
        return;
      }

      await loadWallet();
      setTopupAmount("");
      setShowTopup(false);
      alert(`✓ Portofel încărcat cu ${luris} LURIS`);
    } catch (error) {
      alert("Eroare la încărcare");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-700 rounded-xl p-6">
          <p className="text-green-200 text-sm font-medium">Sold Disponibil</p>
          <p className="text-3xl font-bold text-white mt-2">{balance} LURIS</p>
          <p className="text-green-300 text-xs mt-1">💰 Active</p>
        </div>

        <div className="bg-gradient-to-br from-orange-900 to-orange-800 border border-orange-700 rounded-xl p-6">
          <p className="text-orange-200 text-sm font-medium">Cheltuit</p>
          <p className="text-3xl font-bold text-white mt-2">{spent} LURIS</p>
          <p className="text-orange-300 text-xs mt-1">📊 Total</p>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-xl p-6">
          <p className="text-blue-200 text-sm font-medium">Rămas de Cheltuit</p>
          <p className="text-3xl font-bold text-white mt-2">{remaining} LURIS</p>
          <p className="text-blue-300 text-xs mt-1">💳 Disponibil</p>
        </div>
      </div>

      {/* Topup Button */}
      <button
        onClick={() => setShowTopup(true)}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg font-bold text-white transition transform hover:scale-105"
      >
        ➕ Încarcă Portofel
      </button>

      {/* Transaction History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-800">
          <h3 className="font-bold text-white">📋 Istoric Tranzacții</h3>
        </div>

        <div className="divide-y divide-gray-800">
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-gray-800 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{tx.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {tx.createdAt} • {tx.paymentMethod.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      tx.type === "topup" || tx.type === "sale" ? "text-green-400" : "text-red-400"
                    }`}>
                      {tx.type === "topup" || tx.type === "sale" ? "+" : "-"}{tx.amount}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                      tx.status === "completed"
                        ? "bg-green-900 text-green-200"
                        : tx.status === "pending"
                        ? "bg-yellow-900 text-yellow-200"
                        : "bg-red-900 text-red-200"
                    }`}>
                      {tx.status === "completed" ? "✓ Completă" : tx.status === "pending" ? "⏳ În așteptare" : "✗ Eșuată"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">
              <p>Niciun istoric de tranzacții</p>
            </div>
          )}
        </div>
      </div>

      {/* Topup Modal */}
      {showTopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold mb-4">💰 Încarcă Portofel</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {paymentMethod === "stripe" ? "Sumă (USD)" : paymentMethod === "hdwallet" ? "Sumă (USDT/USDC)" : "Sumă (LURIS)"}
                </label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder={paymentMethod === "stripe" ? "100.00" : paymentMethod === "hdwallet" ? "50.00" : "100"}
                  step={paymentMethod === "metamask" ? "1" : "0.01"}
                  min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                {paymentMethod === "hdwallet" && (
                  <p className="text-xs text-gray-400 mt-1">
                    Trimite USDT sau USDC la adresa ta unică. Creditare automată.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Metodă Plată</label>
                <div className="space-y-2">
                  {hdWalletEnabled && (
                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition border-2 border-green-500">
                      <input
                        type="radio"
                        name="payment"
                        value="hdwallet"
                        checked={paymentMethod === "hdwallet"}
                        onChange={(e) => setPaymentMethod(e.target.value as "stripe" | "metamask" | "hdwallet")}
                        className="accent-green-600"
                      />
                      <div>
                        <p className="font-medium">🔐 Crypto (HD Wallet)</p>
                        <p className="text-xs text-gray-400">USDT/USDC - Polygon, BSC, Ethereum</p>
                        <p className="text-xs text-green-400">✓ Recomandat - Comisioane minime</p>
                      </div>
                    </label>
                  )}

                  {stripeEnabled && (
                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                      <input
                        type="radio"
                        name="payment"
                        value="stripe"
                        checked={paymentMethod === "stripe"}
                        onChange={(e) => setPaymentMethod(e.target.value as "stripe" | "metamask" | "hdwallet")}
                        className="accent-blue-600"
                      />
                      <div>
                        <p className="font-medium">💳 Stripe</p>
                        <p className="text-xs text-gray-400">Card de credit/debit</p>
                      </div>
                    </label>
                  )}

                  {metamaskEnabled && (
                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                      <input
                        type="radio"
                        name="payment"
                        value="metamask"
                        checked={paymentMethod === "metamask"}
                        onChange={(e) => setPaymentMethod(e.target.value as "stripe" | "metamask" | "hdwallet")}
                        className="accent-blue-600"
                      />
                      <div>
                        <p className="font-medium">🔗 MetaMask</p>
                        <p className="text-xs text-gray-400">Plată directă cu wallet</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="bg-blue-900 border border-blue-700 rounded-lg p-3 text-sm text-blue-200">
                ℹ️ HD Wallet: comision ~$0.05 (Polygon) | Stripe 2.9% + $0.30
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTopup(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
              >
                Anulare
              </button>
              <button
                onClick={handleTopup}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition"
              >
                {paymentMethod === "stripe" 
                  ? `Plătește $${topupAmount || "0.00"}` 
                  : paymentMethod === "metamask"
                  ? "Plătește cu MetaMask"
                  : "Obține Adresă Depunere"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HD Wallet Deposit Modal */}
      {showBankTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              🔐 Adresa ta de Depunere Crypto
            </h3>

            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={depositQR} 
                    alt="QR Code" 
                    className="w-64 h-64"
                  />
                </div>
              </div>

              {/* Deposit Address */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  Adresă Unică de Depunere
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={depositAddress}
                    readOnly
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(depositAddress);
                      alert("✓ Adresă copiată în clipboard!");
                    }}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition"
                  >
                    📋 Copiază
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <h4 className="font-bold mb-2 text-blue-300">📖 Instrucțiuni</h4>
                <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                  {depositInstructions}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
                <p className="text-sm text-yellow-300">
                  ⚠️ <strong>Important:</strong> Această adresă este generată automat pentru contul tău. 
                  NU trimite fonduri de pe exchange-uri centralizate. Folosește doar wallet-uri personale (MetaMask, Trust Wallet, etc.).
                </p>
              </div>

              {/* Support Note */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">
                  💬 <strong>Ai nevoie de ajutor?</strong> După efectuarea transferului, 
                  dacă fondurile nu apar în 30 de minute, contactează suportul cu hash-ul tranzacției.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBankTransferModal(false);
                  setDepositAddress("");
                  setDepositInstructions("");
                  setDepositQR("");
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
              >
                Închide
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(depositAddress);
                  alert("✓ Adresă copiată! Acum poți efectua transferul.");
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition"
              >
                📋 Copiază Adresa și Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
