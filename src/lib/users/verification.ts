import type { User } from "@/types";

/**
 * Verifică dacă un user este verificat (permanent sau temporar).
 * Returnează true dacă:
 * - isVerified === true (verificare permanentă), SAU
 * - verifiedUntil există și nu a expirat (verificare temporară)
 */
export function isUserVerified(user: { isVerified?: boolean; verifiedUntil?: Date | string } | null | undefined): boolean {
  if (!user) return false;

  // Verificare permanentă
  if (user.isVerified === true) return true;

  // Verificare temporară (certificat vizitator)
  if (user.verifiedUntil) {
    const now = new Date();
    const expiryDate = typeof user.verifiedUntil === 'string' 
      ? new Date(user.verifiedUntil) 
      : user.verifiedUntil;
    return expiryDate > now;
  }

  return false;
}

/**
 * Returnează data de expirare a verificării temporare, sau null dacă nu există.
 */
export function getVerificationExpiry(user: { verifiedUntil?: Date | string } | null | undefined): Date | null {
  if (!user?.verifiedUntil) return null;
  return typeof user.verifiedUntil === 'string' 
    ? new Date(user.verifiedUntil) 
    : user.verifiedUntil;
}
