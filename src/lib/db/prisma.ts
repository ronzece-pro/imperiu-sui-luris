import { PrismaClient } from "@prisma/client";

declare global {
   
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

/**
 * Ensures a user exists in PostgreSQL for foreign key relationships.
 * Creates or updates the user based on mock/file data.
 */
export async function ensureUserInDatabase(userData: {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  isVerified?: boolean;
  badge?: string;
  role?: string;
}): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { id: userData.id },
      update: {
        email: userData.email,
        username: userData.username || userData.email.split("@")[0],
        fullName: userData.fullName || "Citizen",
        isVerified: userData.isVerified ?? false,
        badge: userData.badge || "citizen",
        role: userData.role || "user",
      },
      create: {
        id: userData.id,
        email: userData.email,
        username: userData.username || userData.email.split("@")[0],
        fullName: userData.fullName || "Citizen",
        passwordHash: "synced-from-mock", // Placeholder - auth uses file/mock system
        isVerified: userData.isVerified ?? false,
        badge: userData.badge || "citizen",
        role: userData.role || "user",
      },
    });
  } catch (error) {
    console.error("Failed to sync user to database:", error);
    // Don't throw - this is a background sync operation
  }
}
