"use client";

import { useState, useEffect } from "react";

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
  const [balance, setBalance] = useState(2500.5);
  const [spent, setSpent] = useState(1245.75);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "tx_1",
      type: "topup",
      amount: 1000,
      description: "Încarcă portofel - Stripe",
      paymentMethod: "stripe",
      status: "completed",
      createdAt: "2024-12-25 14:30",
    },
    {
      id: "tx_2",
      type: "purchase",
      amount: 50,
      description: "Cumpărare postare: Document Oficial",
      paymentMethod: "wallet",
      status: "completed",
      createdAt: "2024-12-24 10:15",
    },
    {
      id: "tx_3",
      type: "purchase",
      amount: 99.99,
      description: "Cumpărare postare: Teren Premium",
      paymentMethod: "metamask",
      status: "completed",
      createdAt: "2024-12-23 16:45",
    },
  ]);

  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "metamask">("stripe");

  const remaining = balance - spent;

  const handleTopup = async () => {
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      alert("Introdu o sumă validă");
      return;
    }

    try {
      const amount = parseFloat(topupAmount);
      if (paymentMethod === "stripe") {
        // Create a Stripe checkout session on the server
        const userStr = localStorage.getItem("user");
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const uid = currentUser?.id || "user_001";
        const res = await fetch("/api/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "addFunds", userId: uid, amount, paymentMethod: "stripe" }),
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

      // Fallback local topup (LURIS amount)
      const newBalance = balance + amount;
      setBalance(newBalance);

      const methodLabel = (paymentMethod as string) === "stripe" ? "Stripe" : "MetaMask";
      const newTransaction: Transaction = {
        id: `tx_${Date.now()}`,
        type: "topup",
        amount,
        description: `Încarcă portofel - ${methodLabel}`,
        paymentMethod,
        status: "completed",
        createdAt: new Date().toLocaleString("ro-RO"),
      };

      setTransactions([newTransaction, ...transactions]);
      setTopupAmount("");
      setShowTopup(false);
      alert(`✓ Portofel încărcat cu ${amount} LURIS`);
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
                <label className="block text-sm font-medium mb-2">Sumă (USD pentru Stripe)</label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="100.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Metodă Plată</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <input
                      type="radio"
                      name="payment"
                      value="stripe"
                      checked={paymentMethod === "stripe"}
                      onChange={(e) => setPaymentMethod(e.target.value as "stripe" | "metamask")}
                      className="accent-blue-600"
                    />
                    <div>
                      <p className="font-medium">💳 Stripe</p>
                      <p className="text-xs text-gray-400">Card de credit/debit</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <input
                      type="radio"
                      name="payment"
                      value="metamask"
                      checked={paymentMethod === "metamask"}
                      onChange={(e) => setPaymentMethod(e.target.value as "stripe" | "metamask")}
                      className="accent-blue-600"
                    />
                    <div>
                      <p className="font-medium">🔗 MetaMask</p>
                      <p className="text-xs text-gray-400">Plată cu criptomonede</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-900 border border-blue-700 rounded-lg p-3 text-sm text-blue-200">
                ℹ️ Comisii: Stripe 2.9% + $0.30 | MetaMask variabil pe rețea
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
                Plătește ${topupAmount || "0.00"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
