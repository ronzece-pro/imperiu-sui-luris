export type VerificationStatus = "pending" | "approved" | "rejected" | "resubmit_required";

export type VerificationDocKind = "bulletin" | "passport" | "driver_license";

export interface VerificationUpload {
  id: string;
  kind: "document" | "selfie";
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  docKind: VerificationDocKind;
  legalFullName: string;
  country: string;
  birthDate: string; // ISO date (YYYY-MM-DD)
  city: string;
  address: string;
  uploads: VerificationUpload[];
  status: VerificationStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
  decidedAt?: Date;
  decidedByUserId?: string;
}
