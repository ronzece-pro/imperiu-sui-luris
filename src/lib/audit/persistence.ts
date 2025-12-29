import type { AuditEventType, AuditLogEntry } from "@/types";
import { mockDatabase } from "@/lib/db/config";
import { adminDatabase } from "@/lib/admin/config";

const DEFAULT_RETENTION_DAYS = 15;
const DEFAULT_MAX_ENTRIES = 5000;

function getRetentionDays(): number {
  const adminValue = adminDatabase.auditSettings?.retentionDays;
  if (typeof adminValue === "number" && Number.isFinite(adminValue)) {
    return Math.max(1, Math.min(365, Math.floor(adminValue)));
  }
  const raw = process.env.AUDIT_RETENTION_DAYS;
  const n = raw ? Number(raw) : DEFAULT_RETENTION_DAYS;
  if (!Number.isFinite(n)) return DEFAULT_RETENTION_DAYS;
  return Math.max(1, Math.min(365, Math.floor(n)));
}

function getMaxEntries(): number {
  const adminValue = adminDatabase.auditSettings?.maxEntries;
  if (typeof adminValue === "number" && Number.isFinite(adminValue)) {
    return Math.max(100, Math.min(100_000, Math.floor(adminValue)));
  }
  const raw = process.env.AUDIT_MAX_ENTRIES;
  const n = raw ? Number(raw) : DEFAULT_MAX_ENTRIES;
  if (!Number.isFinite(n)) return DEFAULT_MAX_ENTRIES;
  return Math.max(100, Math.min(100_000, Math.floor(n)));
}

function pruneAuditLogs() {
  const retentionDays = getRetentionDays();
  const maxEntries = getMaxEntries();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  // 1) TTL prune
  mockDatabase.auditLogs = mockDatabase.auditLogs.filter((e) => +new Date(e.createdAt) >= cutoff);

  // 2) Size cap (keep newest)
  if (mockDatabase.auditLogs.length > maxEntries) {
    mockDatabase.auditLogs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    mockDatabase.auditLogs = mockDatabase.auditLogs.slice(0, maxEntries);
  }
}

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
  pruneAuditLogs();
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
  pruneAuditLogs();
  return entry;
}

export function listAuditLogs(limit = 200): AuditLogEntry[] {
  pruneAuditLogs();
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  return [...mockDatabase.auditLogs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, safeLimit);
}

export function listAuditLogsForUser(userId: string, limit = 200): AuditLogEntry[] {
  pruneAuditLogs();
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  return [...mockDatabase.auditLogs]
    .filter((e) => e.actorUserId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, safeLimit);
}
