export type AuditEventType =
  | "auth_login_success"
  | "marketplace_purchase"
  | "wallet_topup_stripe_pending"
  | "wallet_topup_stripe_completed"
  | "wallet_topup_metamask_completed"
  | "wallet_deduct"
  | "wallet_batch_sweep"
  | "chat_report_created"
  | "verification_submitted"
  | "verification_decided"
  | "admin_grant_document"
  // Help System events
  | "help_category_created"
  | "help_category_updated"
  | "help_category_deactivated"
  | "help_category_deleted"
  | "help_categories_seeded"
  | "help_category_auto_created"
  | "help_post_created"
  | "help_post_updated"
  | "help_post_deleted"
  | "help_post_reported"
  | "help_comment"
  | "help_comment_created"
  | "help_comment_deleted"
  | "help_comment_reported"
  | "help_offer"
  | "help_offer_created"
  | "help_offer_cancelled"
  | "help_confirmed"
  | "help_not_confirmed"
  | "help_cancelled"
  | "help_reward"
  | "help_withdrawal_requested"
  | "help_withdrawal_processed"
  | "help_report_reviewed"
  | "help_settings_updated";

export interface AuditLogEntry {
  id: string;
  type: AuditEventType;
  actorUserId?: string;
  actorName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
