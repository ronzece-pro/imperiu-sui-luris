import crypto from "crypto";
import { mockDatabase } from "@/lib/db/config";
import type { InviteCode } from "@/types";

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

function generateInviteCode() {
  const raw = crypto.randomBytes(9).toString("base64url").toUpperCase();
  return `ISL-${raw.slice(0, 12)}`;
}

export function getActiveInviteForUser(inviterUserId: string): InviteCode | undefined {
  const active = mockDatabase.invites
    .filter((i) => i.inviterUserId === inviterUserId && !i.usedAt)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return active[0];
}

export function getOrCreateActiveInviteForUser(inviterUserId: string): InviteCode {
  const existing = getActiveInviteForUser(inviterUserId);
  if (existing) return existing;

  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateInviteCode();
    if (!mockDatabase.invites.some((i) => i.code === candidate)) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    throw new Error("Failed to generate invite code");
  }

  const invite: InviteCode = {
    code,
    inviterUserId,
    createdAt: new Date(),
  };

  mockDatabase.invites.push(invite);
  return invite;
}

export function consumeInviteCode(inviteCodeRaw: string, usedByUserId: string):
  | { ok: true; invite: InviteCode }
  | { ok: false; error: string; status: number } {
  const code = normalizeInviteCode(inviteCodeRaw);
  if (!code) return { ok: false, error: "Cod de invitație invalid", status: 400 };

  const invite = mockDatabase.invites.find((i) => i.code === code);
  if (!invite) return { ok: false, error: "Cod de invitație invalid", status: 400 };
  if (invite.usedAt || invite.usedByUserId) {
    return { ok: false, error: "Cod de invitație deja folosit", status: 409 };
  }

  invite.usedAt = new Date();
  invite.usedByUserId = usedByUserId;

  return { ok: true, invite };
}

export function listInvitedUsers(inviterUserId: string) {
  return mockDatabase.users
    .filter((u) => (u as any).invitedByUserId === inviterUserId)
    .map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      createdAt: u.createdAt,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
