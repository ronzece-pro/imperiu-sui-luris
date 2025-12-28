// Wallet Types
export interface Wallet {
  userId: string;
  balance: number; // In USD or Luris
  currency: "USD" | "LURIS";
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "purchase" | "topup" | "refund" | "transfer" | "sale";
  amount: number;
  description: string;
  paymentMethod: "stripe" | "metamask" | "wallet";
  status: "pending" | "completed" | "failed";
  relatedPostId?: string;
  relatedSellerId?: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  image?: string;
  price: number; // 0 = free, > 0 = paid
  currency: "USD" | "LURIS";
  createdAt: string;
  likes: number;
  comments: number;
  purchasedBy: string[]; // User IDs who bought this post
}

export interface PaymentMethod {
  type: "stripe" | "metamask";
  isDefault?: boolean;
}
