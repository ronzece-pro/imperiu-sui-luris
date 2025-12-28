import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

export function createToken(userId: string, email: string): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  const payload = { userId, email };
  const secret = JWT_SECRET as jwt.Secret;
  const options: jwt.SignOptions = {
    expiresIn: JWT_EXPIRES_IN as unknown as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    if (!JWT_SECRET) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return { userId: decoded.userId, email: decoded.email };
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
  return bcrypt.hashSync(password, 8);
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}
