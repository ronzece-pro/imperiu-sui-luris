// Admin Types
export interface AdminUser {
  id: string;
  email: string;
  role: "owner" | "admin" | "moderator";
  permissions: AdminPermission[];
}

export type AdminPermission = 
  | "manage_users"
  | "manage_posts"
  | "manage_payments"
  | "manage_settings"
  | "view_analytics";

export interface StripeSettings {
  publicKey: string;
  secretKey: string;
  enabled: boolean;
}

export interface MetaMaskSettings {
  walletAddress: string;
  enabled: boolean;
  networkId: number;
}

export interface LurisSettings {
  name: string;
  symbol: string;
  conversionRate: number; // 1 Luris = X USD
  minPurchase: number;
  maxPurchase: number;
}

export interface PaymentMethod {
  id: string;
  type: "stripe" | "metamask" | "manual";
  enabled: boolean;
  settings: StripeSettings | MetaMaskSettings;
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  timestamp: string;
  details: Record<string, unknown>;
}
