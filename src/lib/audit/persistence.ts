import type { AuditEventType, AuditLogEntry } from "@/types";
import { mockDatabase } from "@/lib/db/config";

function getActorName(userId: string | undefined) {
  if (!userId) return undefined;
  const u = mockDatabase.users.find((x) => x.id === userId);
  return u?.fullName || u?.username || u?.email || userId;
}

export function appendAuditLog(input: {
  type: AuditEventType;
  actorUserId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    actorUserId: input.actorUserId,
    actorName: getActorName(input.actorUserId),
    message: input.message,
    metadata: input.metadata,
    createdAt: new Date(),
  };

  mockDatabase.auditLogs.push(entry);
  return entry;
}

export function listAuditLogs(limit = 200): AuditLogEntry[] {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  return [...mockDatabase.auditLogs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, safeLimit);
}
