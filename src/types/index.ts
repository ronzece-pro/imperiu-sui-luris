// User Types
import type { UserBadge } from "@/lib/users/badges";

export type UserRole = "user" | "admin";

export type AccountStatus = "active" | "blocked" | "banned" | "deleted";

export interface User {
  id: string;
  email: string;
  username: string;
  password?: string; // Should not be exposed in responses
  fullName: string;
  country: string;
  citizenship: "pending" | "active" | "revoked";
  accountStatus?: AccountStatus;
  isVerified?: boolean;
  role?: UserRole;
  badge?: UserBadge;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends Omit<User, "password"> {
  totalLandArea: number;
  totalFunds: number;
  documentCount: number;
  documents: Document[];
  landProperties: LandProperty[];
}

// Document Types
export interface Document {
  id: string;
  userId: string;
  type: "bulletin" | "passport" | "certificate";
  documentNumber: string;
  verificationCode?: string;
  issueDate: Date;
  expiryDate?: Date;
  html?: string;
  status: "active" | "expired" | "revoked";
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

// Land Property Types
export interface LandProperty {
  id: string;
  userId: string;
  name: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  areaSize: number; // in square meters
  type: "agricultural" | "forest" | "water" | "mixed";
  resources: string[]; // water sources, minerals, etc.
  purchaseDate: Date;
  purchasePrice: number;
  description: string;
  images: string[];
  status: "active" | "pending" | "sold";
  createdAt: Date;
  updatedAt: Date;
}

// Marketplace Item Types
export interface MarketplaceItem {
  id: string;
  type: "document" | "land" | "resource";
  name: string;
  description: string;
  price: number;
  currency: string;
  documentType?: "bulletin" | "passport" | "certificate";
  metalType?: "silver" | "gold" | "diamond";
  quantity?: number;
  image?: string;
  landZone?: string;
  landAreaSize?: number;
  landType?: "agricultural" | "forest" | "water" | "mixed";
  availability: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction Types
export interface Transaction {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
  itemType: "document" | "land" | "resource";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

// Feed Post Types
export interface FeedPost {
  id: string;
  authorId: string;
  content: string;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Statistics Types
export interface PlatformStats {
  totalCitizens: number;
  totalLandArea: number;
  totalFunds: number;
  totalDocumentsIssued: number;
  latestMissions: string[]; // Mission descriptions
  missions: {
    water: number;
    food: number;
    energy: number;
  };
}

export interface UserStats {
  citizenshipStatus: string;
  documentsOwned: number;
  landOwned: number;
  accountBalance: number;
  joinDate: Date;
}

export * from "./chat";
