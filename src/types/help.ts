// Help System Types

export type HelpPostUrgency = "normal" | "urgent";
export type HelpPostStatus = "open" | "in_progress" | "completed" | "closed";
export type HelpOfferStatus = "pending" | "accepted" | "rejected" | "confirmed" | "not_confirmed" | "cancelled";
export type HelpReportReason = "spam" | "scam" | "inappropriate" | "other";
export type HelpReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type HelpBadgeLevel = "none" | "bronze" | "silver" | "gold" | "platinum";
export type HelpRewardType = "consecutive_bonus" | "milestone" | "manual_admin";
export type HelpWithdrawalMethod = "crypto" | "revolut" | "bank_transfer";
export type HelpWithdrawalStatus = "pending" | "processing" | "completed" | "rejected";

export interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    posts: number;
  };
}

export interface HelpPost {
  id: string;
  authorId: string;
  categoryId: string;
  title: string;
  description: string;
  images: string[];
  location?: string;
  urgency: HelpPostUrgency;
  fromLocation?: string;
  toLocation?: string;
  vehicleType?: string;
  seats?: number;
  status: HelpPostStatus;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  author?: HelpPostAuthor;
  category?: HelpCategory;
  comments?: HelpComment[];
  likes?: HelpLike[];
  offers?: HelpOffer[];
  _count?: {
    comments: number;
    likes: number;
    offers: number;
  };
}

export interface HelpPostAuthor {
  id: string;
  username: string;
  fullName: string;
  isVerified: boolean;
  badge?: string;
  helpStats?: {
    totalHelpsGiven: number;
    totalHelpsReceived: number;
    badgeLevel: HelpBadgeLevel;
  };
}

export interface HelpComment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  images: string[];
  parentId?: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  author?: HelpPostAuthor;
  replies?: HelpComment[];
  _count?: {
    replies: number;
  };
}

export interface HelpLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface HelpOffer {
  id: string;
  postId: string;
  helperId: string;
  requesterId: string;
  status: HelpOfferStatus;
  chatRoomId?: string;
  helperConfirmed?: boolean;
  requesterConfirmed?: boolean;
  confirmationNote?: string;
  acceptedAt?: Date;
  confirmedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  post?: HelpPost;
  helper?: HelpPostAuthor;
  requester?: HelpPostAuthor;
}

export interface HelpReport {
  id: string;
  reporterId: string;
  postId?: string;
  commentId?: string;
  offerId?: string;
  reason: HelpReportReason;
  description?: string;
  status: HelpReportStatus;
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  
  // Relations
  reporter?: HelpPostAuthor;
  post?: HelpPost;
  comment?: HelpComment;
  offer?: HelpOffer;
}

export interface HelpStats {
  id: string;
  userId: string;
  totalHelpsGiven: number;
  consecutiveHelps: number;
  failedAttempts: number;
  totalHelpsReceived: number;
  totalRewardsEarned: number;
  pendingRewards: number;
  withdrawnRewards: number;
  badgeLevel: HelpBadgeLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface HelpReward {
  id: string;
  userId: string;
  type: HelpRewardType;
  amount: number;
  reason: string;
  offerId?: string;
  status: "credited" | "withdrawn";
  withdrawnAt?: Date;
  createdAt: Date;
}

export interface HelpWithdrawal {
  id: string;
  userId: string;
  amount: number;
  method: HelpWithdrawalMethod;
  walletAddress?: string;
  accountDetails?: string;
  status: HelpWithdrawalStatus;
  processedBy?: string;
  processedAt?: Date;
  txHash?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response types
export interface CreateHelpPostRequest {
  categoryId?: string;
  categoryName?: string; // pentru categorii noi auto-create
  title: string;
  description: string;
  images?: string[];
  location?: string;
  urgency?: HelpPostUrgency;
  fromLocation?: string;
  toLocation?: string;
  vehicleType?: string;
  seats?: number;
}

export interface CreateHelpCommentRequest {
  text: string;
  images?: string[];
  parentId?: string;
}

export interface CreateHelpOfferRequest {
  message?: string;
}

export interface ConfirmHelpRequest {
  confirmed: boolean; // true = "am fost ajutat", false = "nu am fost ajutat"
  note?: string;
}

export interface HelperActionRequest {
  action: "no_help_wanted" | "different_help" | "report_scam";
  note?: string;
}

export interface CreateHelpReportRequest {
  postId?: string;
  commentId?: string;
  offerId?: string;
  reason: HelpReportReason;
  description?: string;
}

export interface RequestWithdrawalRequest {
  amount: number;
  method: HelpWithdrawalMethod;
  walletAddress?: string;
  accountDetails?: string;
}

// Admin types
export interface HelpAdminSettings {
  consecutiveBonusThreshold: number; // default 5
  consecutiveBonusAmount: number; // default 50 (în RON, se convertește în LURIS)
  minimumWithdrawAmount: number; // default 150
  maxActivePostsPerUser: number; // default 3
  postCooldownMinutes: number; // default 60
  badgeLevels: {
    bronze: number; // 10 ajutoare
    silver: number; // 25 ajutoare
    gold: number; // 50 ajutoare
    platinum: number; // 100 ajutoare
  };
}

export const DEFAULT_HELP_SETTINGS: HelpAdminSettings = {
  consecutiveBonusThreshold: 5,
  consecutiveBonusAmount: 50,
  minimumWithdrawAmount: 150,
  maxActivePostsPerUser: 3,
  postCooldownMinutes: 60,
  badgeLevels: {
    bronze: 10,
    silver: 25,
    gold: 50,
    platinum: 100,
  },
};

// Default categories
export const DEFAULT_HELP_CATEGORIES = [
  { name: "Ajut cu Transport", slug: "transport", icon: "🚗", color: "#3B82F6", description: "Oferă sau cere transport între localități" },
  { name: "Ajut cu Alimente", slug: "alimente", icon: "🥫", color: "#22C55E", description: "Donează sau cere alimente" },
  { name: "Ajut cu Haine/Încălțăminte", slug: "haine", icon: "👕", color: "#A855F7", description: "Donează sau cere haine și încălțăminte" },
  { name: "Ajut cu Afișe prin Oraș", slug: "afise", icon: "📋", color: "#F59E0B", description: "Voluntari pentru distribuire afișe" },
  { name: "Ajut cu Consiliere Juridică", slug: "avocatura", icon: "⚖️", color: "#EF4444", description: "Sfaturi juridice gratuite" },
  { name: "Ajut cu Sfaturi Financiare", slug: "finante", icon: "💰", color: "#10B981", description: "Consultanță financiară gratuită" },
  { name: "Ajut cu Hrană pentru Animale", slug: "animale", icon: "🐾", color: "#F97316", description: "Hrană și îngrijire pentru animale" },
];

// Share URLs helpers
export interface ShareUrls {
  facebook: string;
  twitter: string;
  whatsapp: string;
  telegram: string;
  copy: string;
}

export function generateShareUrls(post: HelpPost, baseUrl: string): ShareUrls {
  const postUrl = `${baseUrl}/help/post/${post.id}`;
  const text = encodeURIComponent(`${post.title} - Imperiul Sui Juris`);
  
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${text}`,
    whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(postUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${text}`,
    copy: postUrl,
  };
}
