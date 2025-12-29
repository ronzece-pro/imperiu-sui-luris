import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { getActiveInviteForUser, getOrCreateActiveInviteForUser, listInvitedUsers } from "@/lib/invites/persistence";

export async function GET(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;

  const active = getActiveInviteForUser(authed.decoded.userId);
  const invitedUsers = listInvitedUsers(authed.decoded.userId);

  return successResponse({
    activeInviteCode: active?.code || null,
    invitedUsers,
  });
}

export async function POST(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;

  try {
    const invite = getOrCreateActiveInviteForUser(authed.decoded.userId);
    return successResponse({ activeInviteCode: invite.code }, "Invite generated");
  } catch {
    return errorResponse("Nu pot genera codul de invitație", 500);
  }
}
