export type AuditEventType =
  | "auth_login_success"
  | "marketplace_purchase"
  | "wallet_topup_stripe_pending"
  | "wallet_topup_stripe_completed"
  | "wallet_topup_metamask_completed"
  | "wallet_deduct"
  | "chat_report_created"
  | "verification_submitted"
  | "verification_decided"
  | "admin_grant_document";

export interface AuditLogEntry {
  id: string;
  type: AuditEventType;
  actorUserId?: string;
  actorName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
