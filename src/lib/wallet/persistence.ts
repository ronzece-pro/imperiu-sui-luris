// Simple in-memory wallet persistence for dev
export const walletStore: Record<string, any> = {};

export function getOrCreateWallet(userId: string) {
  const key = `${userId}_wallet`;
  if (!walletStore[key]) {
    walletStore[key] = {
      userId,
      balance: 0,
      currency: "LURIS",
      transactions: [],
      createdAt: new Date().toISOString(),
    };
  }
  return walletStore[key];
}

export function addFundsToWallet(userId: string, amount: number, details?: any) {
  const wallet = getOrCreateWallet(userId);
  wallet.balance += amount;
  const tx = {
    id: `tx_${Date.now()}`,
    type: "topup",
    amount,
    details: details || {},
    status: "completed",
    createdAt: new Date().toISOString(),
  };
  wallet.transactions.unshift(tx);
  return { wallet, tx };
}

export function deductFundsFromWallet(userId: string, amount: number, details?: any) {
  const wallet = getOrCreateWallet(userId);
  if (wallet.balance < amount) throw new Error("Insufficient funds");
  wallet.balance -= amount;
  const tx = {
    id: `tx_${Date.now()}`,
    type: "purchase",
    amount,
    details: details || {},
    status: "completed",
    createdAt: new Date().toISOString(),
  };
  wallet.transactions.unshift(tx);
  return { wallet, tx };
}

export function getWallet(userId: string) {
  return getOrCreateWallet(userId);
}
