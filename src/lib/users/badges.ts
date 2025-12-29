export type UserBadge =
  | "citizen"
  | "doctor"
  | "engineer"
  | "resident_citizen"
  | "passport_citizen"
  | "diplomat"
  | "ambassador"
  | "minister"
  | "prime_minister"
  | "president"
  | "prosecutor"
  | "police"
  | "judge"
  | "senator"
  | "deputy"
  | "mayor"
  | "governor"
  | "general"
  | "intelligence_director"
  | "treasurer"
  | "secretary_of_state";

export const BADGES: Array<{ id: UserBadge; label: string }> = [
  { id: "citizen", label: "Cetățean" },
  { id: "doctor", label: "Doctor" },
  { id: "engineer", label: "Inginer" },
  { id: "resident_citizen", label: "Cetățean rezident" },
  { id: "passport_citizen", label: "Cetățean cu pașaport" },
  { id: "diplomat", label: "Diplomat" },
  { id: "ambassador", label: "Ambasador" },
  { id: "minister", label: "Ministru" },
  { id: "prime_minister", label: "Prim-ministru" },
  { id: "president", label: "Președinte" },
  { id: "prosecutor", label: "Procuror" },
  { id: "police", label: "Polițist" },
  { id: "judge", label: "Judecător" },
  { id: "senator", label: "Senator" },
  { id: "deputy", label: "Deputat" },
  { id: "mayor", label: "Primar" },
  { id: "governor", label: "Guvernator" },
  { id: "general", label: "General" },
  { id: "intelligence_director", label: "Director servicii secrete" },
  { id: "treasurer", label: "Trezorier" },
  { id: "secretary_of_state", label: "Secretar de stat" },
];

export function isUserBadge(value: unknown): value is UserBadge {
  return typeof value === "string" && BADGES.some((b) => b.id === value);
}

export function getBadgeLabel(badge: UserBadge): string {
  return BADGES.find((b) => b.id === badge)?.label ?? badge;
}
