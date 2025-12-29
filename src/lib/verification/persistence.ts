import type { VerificationDocKind, VerificationRequest, VerificationStatus, VerificationUpload } from "@/types";
import { mockDatabase } from "@/lib/db/config";

type UserRow = (typeof mockDatabase.users)[number] & { isVerified?: boolean };

export function getLatestVerificationRequestForUser(userId: string): VerificationRequest | null {
  const list = mockDatabase.verificationRequests.filter((r) => r.userId === userId);
  if (list.length === 0) return null;
  return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0] || null;
}

export function createVerificationRequest(input: {
  userId: string;
  docKind: VerificationDocKind;
  legalFullName: string;
  country: string;
  birthDate: string;
  city: string;
  address: string;
  uploads: VerificationUpload[];
}): VerificationRequest {
  const now = new Date();
  const req: VerificationRequest = {
    id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    docKind: input.docKind,
    legalFullName: input.legalFullName,
    country: input.country,
    birthDate: input.birthDate,
    city: input.city,
    address: input.address,
    uploads: input.uploads,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  mockDatabase.verificationRequests.push(req);
  return req;
}

export function listVerificationRequests(limit = 200): VerificationRequest[] {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  return [...mockDatabase.verificationRequests]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, safeLimit);
}

export function decideVerificationRequest(input: {
  requestId: string;
  status: Exclude<VerificationStatus, "pending">;
  adminUserId: string;
  adminNote?: string;
}): VerificationRequest | null {
  const req = mockDatabase.verificationRequests.find((r) => r.id === input.requestId);
  if (!req) return null;

  const now = new Date();
  req.status = input.status;
  req.adminNote = input.adminNote;
  req.updatedAt = now;
  req.decidedAt = now;
  req.decidedByUserId = input.adminUserId;

  // If approved, mark user verified
  if (input.status === "approved") {
    const user = mockDatabase.users.find((u) => u.id === req.userId);
    if (user) {
      (user as UserRow).isVerified = true;
      user.updatedAt = now;
    }
  }

  return req;
}
