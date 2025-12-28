"use client";

import { useState } from "react";

interface LurisTransaction {
  id: string;
  userId: string;
  userName: string;
  action: "add" | "deduct" | "purchase";
  amount: number;
  reason: string;
  createdAt: string;
}

export default function AdminLurisManagement() {
  const [conversationRate, setConversationRate] = useState(0.1);
  const [minPurchase, setMinPurchase] = useState(10);
  const [maxPurchase, setMaxPurchase] = useState(1000);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [addPointsModal, setAddPointsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [pointsAmount, setPointsAmount] = useState("");
  const [reason, setReason] = useState("");

  const [transactions, setTransactions] = useState<LurisTransaction[]>([
    {
      id: "tx_1",
      userId: "user_1",
      userName: "Ion Popescu",
      action: "purchase",
      amount: 1000,
      reason: "Cumpărare Luris - Stripe",
      createdAt: "2024-03-15 10:30",
    },
    {
      id: "tx_2",
      userId: "user_2",
      userName: "Maria Ionescu",
      action: "add",
      amount: 500,
      reason: "Bonus de bun venit",
      createdAt: "2024-03-14 15:45",
    },
  ]);

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      localStorage.setItem(
        "luris_settings",
        JSON.stringify({
          conversationRate,
          minPurchase,
          maxPurchase,
          updatedAt: new Date().toISOString(),
        })
      );
      alert("Setări Luris salvate cu succes!");
    } catch (error) {
      alert("Eroare la salvarea setarilor");
      console.error(error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddPoints = async () => {
    if (!selectedUser.trim() || !pointsAmount.trim() || !reason.trim()) {
      alert("Te rog completează toate câmpurile");
      return;
    }

    try {
      const newTransaction: LurisTransaction = {
        id: `tx_${Date.now()}`,
        userId: selectedUser,
        userName: "User " + selectedUser,
        action: "add",
        amount: parseInt(pointsAmount),
        reason,
        createdAt: new Date().toLocaleString("ro-RO"),
      };

      setTransactions((prev) => [newTransaction, ...prev]);
      setAddPointsModal(false);
      setSelectedUser("");
      setPointsAmount("");
      setReason("");
      alert("Puncte Luris adăugate cu succes!");
    } catch (error) {
      alert("Eroare la adăugare puncte");
      console.error(error);
    }
  };

  const calculateUSD = (luris: number) => {
    return (luris * conversationRate).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Luris Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-bold">⚙️ Setări Luris</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Curs de Schimb (1 Luris = X USD)
            </label>
            <input
              type="number"
              value={conversationRate}
              onChange={(e) => setConversationRate(parseFloat(e.target.value))}
              step="0.01"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Exemplu: 0.1 = 1 Luris = $0.10
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Cumpărare Minimă (Luris)
            </label>
            <input
              type="number"
              value={minPurchase}
              onChange={(e) => setMinPurchase(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Cumpărare Maximă (Luris)
            </label>
            <input
              type="number"
              value={maxPurchase}
              onChange={(e) => setMaxPurchase(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Cost max în USD
            </label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-300">
              ${calculateUSD(maxPurchase)}
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSavingSettings}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition"
        >
          {isSavingSettings ? "Se salvează..." : "Salvează Setări"}
        </button>
      </div>

      {/* Add Points Button */}
      <div>
        <button
          onClick={() => setAddPointsModal(true)}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition w-full sm:w-auto"
        >
          ➕ Adăugă Puncte Luris
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Curs Actual</p>
          <p className="text-2xl font-bold mt-2">
            1 Luris = ${conversationRate.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Cumpărare Min/Max</p>
          <p className="text-xl font-bold mt-2">
            {minPurchase} - {maxPurchase} Luris
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Cost Max USD</p>
          <p className="text-2xl font-bold mt-2">${calculateUSD(maxPurchase)}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-bold">📊 Istoric Tranzacții</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Utilizator</th>
                <th className="px-4 py-3 text-left font-semibold">Acțiune</th>
                <th className="px-4 py-3 text-left font-semibold">Cantitate</th>
                <th className="px-4 py-3 text-left font-semibold">Motiv</th>
                <th className="px-4 py-3 text-left font-semibold">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-800 transition">
                  <td className="px-4 py-3 font-medium">{tx.userName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.action === "add"
                          ? "bg-green-900 text-green-200"
                          : tx.action === "deduct"
                          ? "bg-red-900 text-red-200"
                          : "bg-blue-900 text-blue-200"
                      }`}
                    >
                      {tx.action === "add"
                        ? "Adaugă"
                        : tx.action === "deduct"
                        ? "Scade"
                        : "Cumpă"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold">
                    {tx.action === "deduct" ? "-" : "+"}
                    {tx.amount}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{tx.reason}</td>
                  <td className="px-4 py-3 text-gray-400">{tx.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Points Modal */}
      {addPointsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Adăugă Puncte Luris</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  ID Utilizator
                </label>
                <input
                  type="text"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  placeholder="user_1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Cantitate Luris
                </label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                {pointsAmount && (
                  <p className="text-xs text-gray-400 mt-1">
                    ≈ ${calculateUSD(parseInt(pointsAmount))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Motiv</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Bonus, referral, etc..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setAddPointsModal(false);
                  setSelectedUser("");
                  setPointsAmount("");
                  setReason("");
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
              >
                Anulare
              </button>
              <button
                onClick={handleAddPoints}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition"
              >
                Adăugă
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
