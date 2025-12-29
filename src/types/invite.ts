export interface InviteCode {
  code: string;
  inviterUserId: string;
  createdAt: Date;
  usedAt?: Date;
  usedByUserId?: string;
}
