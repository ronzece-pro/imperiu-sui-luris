import { NextRequest, NextResponse } from "next/server";

// Simple JWT token utility (in production, use jsonwebtoken library)
export function createToken(userId: string, email: string): string {
  // For development, this is a simple base64 encoded token
  const payload = JSON.stringify({
    userId,
    email,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  return Buffer.from(payload).toString("base64");
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (payload.exp < Date.now()) {
      return null;
    }
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export function getAuthTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

export function hashPassword(password: string): string {
  // In production, use bcrypt
  return Buffer.from(password).toString("base64");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
