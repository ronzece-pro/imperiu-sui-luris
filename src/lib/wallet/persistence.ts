let prismaClient: unknown | undefined;

async function getPrisma() {
  if (prismaClient) return prismaClient as { $transaction: unknown };

  const globalAny = globalThis as unknown as { __prisma?: unknown };
  if (globalAny.__prisma) {
    prismaClient = globalAny.__prisma;
    return prismaClient as { $transaction: unknown };
  }

  const mod = (await import("@prisma/client")) as unknown as { PrismaClient?: new () => unknown };
  if (!mod.PrismaClient) {
    throw new Error("PrismaClient is unavailable. Did you run `prisma generate`?");
  }

  prismaClient = new mod.PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalAny.__prisma = prismaClient;
  }

  return prismaClient as { $transaction: unknown };
}

// Dev fallback (only used when DATABASE_URL is missing)
type DevWalletTx = {
  id: string;
  type: "topup" | "purchase";
  amount: number;
  details: Record<string, unknown>;
  status: "pending" | "completed" | "failed";
  createdAt: string;
};

type DevWallet = {
  userId: string;
  balance: number;
  currency: "LURIS";
  transactions: DevWalletTx[];
  createdAt: string;
};

type DbClient = {
  wallet: {
    upsert(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  walletTransaction: {
    create(args: unknown): Promise<unknown>;
    upsert(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
};

export const walletStore: Record<string, DevWallet> = {};

function hasDatabase() {
  return !!process.env.DATABASE_URL;
}

function toDecimal(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return Number(safe.toFixed(2));
}

export async function getOrCreateWallet(userId: string) {
  if (!hasDatabase()) {
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

  const prisma = (await getPrisma()) as unknown as Pick<DbClient, "wallet">;
  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, currency: "LURIS", balance: toDecimal(0) },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });

  const w = wallet as unknown as {
    userId: unknown;
    balance: unknown;
    currency: unknown;
    transactions?: unknown[];
    createdAt: Date;
    updatedAt: Date;
  };

  const txs = Array.isArray(w.transactions) ? w.transactions : [];

  return {
    userId: String(w.userId),
    balance: Number(w.balance),
    currency: String(w.currency),
    transactions: txs.map((raw) => {
      const tx = raw as {
        id?: unknown;
        type?: unknown;
        amount?: unknown;
        status?: unknown;
        source?: unknown;
        description?: unknown;
        stripeSessionId?: unknown;
        metamaskTxHash?: unknown;
        createdAt?: Date;
        metadata?: unknown;
      };

      return {
        id: String(tx.id ?? ""),
        type: String(tx.type ?? ""),
        amount: Number(tx.amount ?? 0),
        status: String(tx.status ?? ""),
        source: tx.source == null ? null : String(tx.source),
        description: tx.description == null ? null : String(tx.description),
        stripeSessionId: tx.stripeSessionId == null ? null : String(tx.stripeSessionId),
        metamaskTxHash: tx.metamaskTxHash == null ? null : String(tx.metamaskTxHash),
        createdAt: tx.createdAt ? tx.createdAt.toISOString() : new Date().toISOString(),
        metadata: tx.metadata,
      };
    }),
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function addFundsToWallet(userId: string, amount: number, details?: Record<string, unknown>) {
  if (!hasDatabase()) {
    const wallet = (await getOrCreateWallet(userId)) as DevWallet;
    wallet.balance += amount;
    const tx = {
      id: `tx_${Date.now()}`,
      type: "topup" as const,
      amount,
      details: details || {},
      status: "completed" as const,
      createdAt: new Date().toISOString(),
    };
    wallet.transactions.unshift(tx);
    return { wallet, tx };
  }

  const prisma = (await getPrisma()) as unknown as { $transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T> };
  const result = await prisma.$transaction(async (db: DbClient) => {
    const wallet = (await db.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, currency: "LURIS", balance: toDecimal(0) },
    })) as { id: string; userId: string; currency: string; balance: unknown };

    const tx = (await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "topup",
        amount: toDecimal(amount),
        status: "completed",
        source: (details?.source as string | undefined) || (details?.paymentMethod as string | undefined) || null,
        description: (details?.description as string | undefined) || null,
        metadata: details ?? undefined,
      },
    })) as { id: string; type: string; amount: unknown; status: string; createdAt: Date; metadata?: unknown };

    const updated = (await db.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: toDecimal(amount) } },
    })) as { userId: string; balance: unknown; currency: string };

    return { wallet: updated, tx };
  });

  return {
    wallet: { userId: result.wallet.userId, balance: Number(result.wallet.balance), currency: result.wallet.currency },
    tx: {
      id: result.tx.id,
      type: result.tx.type,
      amount: Number(result.tx.amount),
      status: result.tx.status,
      createdAt: result.tx.createdAt.toISOString(),
      metadata: result.tx.metadata,
    },
  };
}

export async function deductFundsFromWallet(userId: string, amount: number, details?: Record<string, unknown>) {
  if (!hasDatabase()) {
    const wallet = (await getOrCreateWallet(userId)) as DevWallet;
    if (wallet.balance < amount) throw new Error("Insufficient funds");
    wallet.balance -= amount;
    const tx = {
      id: `tx_${Date.now()}`,
      type: "purchase" as const,
      amount,
      details: details || {},
      status: "completed" as const,
      createdAt: new Date().toISOString(),
    };
    wallet.transactions.unshift(tx);
    return { wallet, tx };
  }

  const prisma = (await getPrisma()) as unknown as { $transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T> };
  const result = await prisma.$transaction(async (db: DbClient) => {
    const wallet = (await db.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, currency: "LURIS", balance: toDecimal(0) },
    })) as { id: string; userId: string; currency: string; balance: unknown };

    if (Number(wallet.balance) < toDecimal(amount)) {
      throw new Error("Insufficient funds");
    }

    const tx = (await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "purchase",
        amount: toDecimal(amount),
        status: "completed",
        source: (details?.source as string | undefined) || (details?.paymentMethod as string | undefined) || "wallet",
        description: (details?.description as string | undefined) || null,
        metadata: details ?? undefined,
      },
    })) as { id: string; type: string; amount: unknown; status: string; createdAt: Date; metadata?: unknown };

    const updated = (await db.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: toDecimal(amount) } },
    })) as { userId: string; balance: unknown; currency: string };

    return { wallet: updated, tx };
  });

  return {
    wallet: { userId: result.wallet.userId, balance: Number(result.wallet.balance), currency: result.wallet.currency },
    tx: {
      id: result.tx.id,
      type: result.tx.type,
      amount: Number(result.tx.amount),
      status: result.tx.status,
      createdAt: result.tx.createdAt.toISOString(),
      metadata: result.tx.metadata,
    },
  };
}

export async function createPendingStripeTopup(
  userId: string,
  lurisAmount: number,
  stripeSessionId: string,
  metadata?: unknown
) {
  if (!hasDatabase()) return;
  const prisma = (await getPrisma()) as unknown as { $transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T> };
  await prisma.$transaction(async (db: DbClient) => {
    const wallet = (await db.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, currency: "LURIS", balance: toDecimal(0) },
    })) as { id: string };

    await db.walletTransaction.upsert({
      where: { stripeSessionId },
      update: {},
      create: {
        walletId: wallet.id,
        type: "topup",
        amount: toDecimal(lurisAmount),
        status: "pending",
        source: "stripe",
        stripeSessionId,
        metadata: metadata ?? undefined,
      },
    });
  });
}

export async function completeStripeTopup(
  userId: string,
  lurisAmount: number,
  stripeSessionId: string,
  metadata?: unknown
) {
  if (!hasDatabase()) {
    await addFundsToWallet(userId, lurisAmount, { source: "stripe", stripeSessionId, metadata });
    return;
  }

  const prisma = (await getPrisma()) as unknown as { $transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T> };
  await prisma.$transaction(async (db: DbClient) => {
    const wallet = (await db.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, currency: "LURIS", balance: toDecimal(0) },
    })) as { id: string };

    const existing = (await db.walletTransaction.findUnique({ where: { stripeSessionId } })) as
      | { id: string; status: string; metadata?: unknown }
      | null;
    if (existing && existing.status === "completed") {
      return;
    }

    if (existing) {
      await db.walletTransaction.update({
        where: { id: existing.id },
        data: { status: "completed", metadata: metadata ?? existing.metadata },
      });
    } else {
      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "topup",
          amount: toDecimal(lurisAmount),
          status: "completed",
          source: "stripe",
          stripeSessionId,
          metadata: metadata ?? undefined,
        },
      });
    }

    await db.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: toDecimal(lurisAmount) } },
    });
  });
}

export async function completeMetamaskTopup(
  userId: string,
  lurisAmount: number,
  txHash: string,
  metadata?: unknown
) {
  if (!hasDatabase()) {
    await addFundsToWallet(userId, lurisAmount, { source: "metamask", txHash, metadata });
    return;
  }

  const prisma = (await getPrisma()) as unknown as { $transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T> };
  await prisma.$transaction(async (db: DbClient) => {
    const wallet = (await db.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, currency: "LURIS", balance: toDecimal(0) },
    })) as { id: string };

    const existing = (await db.walletTransaction.findUnique({ where: { metamaskTxHash: txHash } })) as unknown;
    if (existing) {
      return;
    }

    await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "topup",
        amount: toDecimal(lurisAmount),
        status: "completed",
        source: "metamask",
        metamaskTxHash: txHash,
        metadata: metadata ?? undefined,
      },
    });

    await db.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: toDecimal(lurisAmount) } },
    });
  });
}

export async function getWallet(userId: string) {
  return getOrCreateWallet(userId);
}
