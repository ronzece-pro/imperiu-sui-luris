"use client";

import { useEffect, useState } from "react";

interface InsufficientFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount: number;
  currentBalance: number;
  itemName: string;
}

export default function InsufficientFundsModal({
  isOpen,
  onClose,
  requiredAmount,
  currentBalance,
  itemName,
}: InsufficientFundsModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleGoToWallet = () => {
    window.location.href = "/dashboard#wallet";
  };

  if (!isOpen) return null;

  const deficit = requiredAmount - currentBalance;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-yellow-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl transform transition-all duration-300 ${isVisible ? "scale-100" : "scale-95"}`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-4xl">💎</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-white mb-3">
          Nu deții moneda Imperiului!
        </h2>

        {/* Subtitle */}
        <p className="text-center text-gray-300 mb-6 text-sm">
          Pentru a cumpăra produse de pe marketplace ai nevoie de <strong className="text-yellow-400">LURIS</strong>
        </p>

        {/* Product Info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Produs</span>
            <span className="text-white font-semibold text-sm">{itemName}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Preț</span>
            <span className="text-yellow-400 font-bold">{requiredAmount} LURIS</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Soldul tău</span>
            <span className={`font-bold ${currentBalance > 0 ? "text-cyan-400" : "text-red-400"}`}>
              {currentBalance} LURIS
            </span>
          </div>
          <div className="border-t border-slate-700 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Lipsă</span>
              <span className="text-red-400 font-bold">{deficit} LURIS</span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-blue-300 text-sm text-center">
            ✨ <strong>Procură LURIS</strong> din Portofel folosind Stripe, MetaMask sau Transfer Bancar
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
          >
            Mai târziu
          </button>
          <button
            onClick={handleGoToWallet}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold rounded-lg transition shadow-lg hover:shadow-yellow-500/50"
          >
            🏦 Du-mă la Portofel
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-xs mt-4">
          LURIS este moneda oficială a Imperiului Sui Juris
        </p>
      </div>
    </div>
  );
}
