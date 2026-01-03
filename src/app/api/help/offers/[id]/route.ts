import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { prisma } from "@/lib/db/prisma";
import { getHelpSettings, calculateBadgeLevel, checkConsecutiveBonus, ronToLuris } from "@/lib/help/settings";
import { addFundsToWallet } from "@/lib/wallet/persistence";

// GET /api/help/offers/[id] - Get offer details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const { id: offerId } = await params;

    const offer = await prisma.helpOffer.findUnique({
      where: { id: offerId },
      include: {
        post: {
          include: {
            category: true,
            author: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
        helper: {
          select: {
            id: true,
            username: true,
            fullName: true,
            isVerified: true,
            badge: true,
          },
        },
        requester: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!offer) {
      return errorResponse("Oferta nu există", 404);
    }

    // Only helper, requester, or admin can view
    const isParticipant = offer.helperId === userId || offer.requesterId === userId;
    const isAdmin = authed.user?.role === "admin";

    if (!isParticipant && !isAdmin) {
      return errorResponse("Nu ai acces la această ofertă", 403);
    }

    return successResponse(offer);
  } catch (error) {
    console.error("Error fetching help offer:", error);
    return errorResponse("Eroare la încărcarea ofertei", 500);
  }
}

// PUT /api/help/offers/[id] - Update offer status (confirm help, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const { id: offerId } = await params;
    const body = await request.json();
    const { action, note } = body;

    const offer = await prisma.helpOffer.findUnique({
      where: { id: offerId },
      include: {
        post: true,
        helper: {
          select: { id: true, fullName: true },
        },
        requester: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!offer) {
      return errorResponse("Oferta nu există", 404);
    }

    const isHelper = offer.helperId === userId;
    const isRequester = offer.requesterId === userId;
    const isAdmin = authed.user?.role === "admin";

    if (!isHelper && !isRequester && !isAdmin) {
      return errorResponse("Nu ai acces la această ofertă", 403);
    }

    // Requester actions: "was_helped" | "not_helped"
    if (isRequester && (action === "was_helped" || action === "not_helped")) {
      if (offer.status !== "accepted") {
        return errorResponse("Oferta nu este în starea corectă pentru confirmare", 400);
      }

      const wasHelped = action === "was_helped";
      const settings = await getHelpSettings();

      // Update offer
      const updatedOffer = await prisma.helpOffer.update({
        where: { id: offerId },
        data: {
          status: wasHelped ? "confirmed" : "not_confirmed",
          requesterConfirmed: wasHelped,
          confirmationNote: note?.trim() || null,
          confirmedAt: new Date(),
          closedAt: new Date(),
        },
      });

      // Update helper stats
      const helperStats = await prisma.helpStats.upsert({
        where: { userId: offer.helperId },
        update: {},
        create: { userId: offer.helperId },
      });

      if (wasHelped) {
        // Success - increment helps and check for bonus
        const newConsecutive = helperStats.consecutiveHelps + 1;
        const newTotalHelps = helperStats.totalHelpsGiven + 1;
        const newBadgeLevel = calculateBadgeLevel(newTotalHelps, settings);
        const earnedBonus = checkConsecutiveBonus(newConsecutive, settings);

        let bonusAmount = 0;
        if (earnedBonus) {
          bonusAmount = settings.consecutiveBonusAmount;
          const lurisAmount = ronToLuris(bonusAmount);

          // Add reward record
          await prisma.helpReward.create({
            data: {
              userId: offer.helperId,
              type: "consecutive_bonus",
              amount: bonusAmount,
              reason: `Bonus pentru ${settings.consecutiveBonusThreshold} ajutoare consecutive`,
              offerId,
            },
          });

          // Add LURIS to wallet
          await addFundsToWallet(offer.helperId, lurisAmount, {
            source: "help_reward",
            description: `Bonus ajutor: ${settings.consecutiveBonusThreshold} ajutoare consecutive`,
          });

          // Notify helper about bonus
          await prisma.notification.create({
            data: {
              userId: offer.helperId,
              type: "help_reward",
              title: "🎉 Ai primit un bonus!",
              message: `Felicitări! Ai ajutat ${settings.consecutiveBonusThreshold} persoane consecutiv și ai primit ${bonusAmount} RON (${lurisAmount} LURIS) în portofel!`,
            },
          });
        }

        // Update helper stats
        await prisma.helpStats.update({
          where: { userId: offer.helperId },
          data: {
            totalHelpsGiven: { increment: 1 },
            consecutiveHelps: newConsecutive,
            totalRewardsEarned: earnedBonus ? { increment: bonusAmount } : undefined,
            badgeLevel: newBadgeLevel,
          },
        });

        // Update requester stats
        await prisma.helpStats.upsert({
          where: { userId: offer.requesterId },
          update: { totalHelpsReceived: { increment: 1 } },
          create: {
            userId: offer.requesterId,
            totalHelpsReceived: 1,
          },
        });

        // Notify helper
        await prisma.notification.create({
          data: {
            userId: offer.helperId,
            type: "help_confirmed",
            title: "Ajutor confirmat! ✅",
            message: `${offer.requester.fullName} a confirmat că l-ai ajutat. ${earnedBonus ? `Ai primit și bonus de ${bonusAmount} RON!` : "Continuă să ajuți pentru bonus!"}`,
          },
        });

        appendAuditLog({
          type: "help_confirmed",
          actorUserId: userId,
          message: `Ajutor confirmat de către ${offer.requester.fullName}`,
          metadata: { offerId, helperId: offer.helperId, bonusEarned: earnedBonus, bonusAmount },
        });
      } else {
        // Not helped - add red point, reset consecutive
        await prisma.helpStats.update({
          where: { userId: offer.helperId },
          data: {
            failedAttempts: { increment: 1 },
            consecutiveHelps: 0, // Reset consecutive streak
          },
        });

        // Notify helper
        await prisma.notification.create({
          data: {
            userId: offer.helperId,
            type: "help_not_confirmed",
            title: "Ajutor neconfirmat",
            message: `${offer.requester.fullName} a indicat că nu a primit ajutor. ${note ? `Motiv: ${note}` : ""}`,
          },
        });

        appendAuditLog({
          type: "help_not_confirmed",
          actorUserId: userId,
          message: `Ajutor neconfirmat de către ${offer.requester.fullName}`,
          metadata: { offerId, helperId: offer.helperId, note },
        });
      }

      // Check if all offers for this post are closed
      const openOffers = await prisma.helpOffer.count({
        where: {
          postId: offer.postId,
          status: { in: ["pending", "accepted"] },
        },
      });

      // If at least one was confirmed, mark post as completed
      if (wasHelped) {
        await prisma.helpPost.update({
          where: { id: offer.postId },
          data: { status: "completed" },
        });
      } else if (openOffers === 0) {
        // If no more open offers, reset post to open
        await prisma.helpPost.update({
          where: { id: offer.postId },
          data: { status: "open" },
        });
      }

      return successResponse(updatedOffer, wasHelped ? "Ajutor confirmat cu succes!" : "Feedback înregistrat");
    }

    // Helper actions: "no_help_wanted" | "different_help" | "report_scam"
    if (isHelper && (action === "no_help_wanted" || action === "different_help" || action === "report_scam")) {
      if (offer.status !== "accepted") {
        return errorResponse("Oferta nu este în starea corectă", 400);
      }

      if (action === "report_scam") {
        // Create report
        await prisma.helpReport.create({
          data: {
            reporterId: userId,
            offerId,
            reason: "scam",
            description: note?.trim() || "Raportat ca scam de către helper",
          },
        });
      }

      // Close the offer without points
      await prisma.helpOffer.update({
        where: { id: offerId },
        data: {
          status: "cancelled",
          helperConfirmed: false,
          confirmationNote: `${action}: ${note || "Fără detalii"}`,
          closedAt: new Date(),
        },
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          userId: offer.requesterId,
          type: "help_cancelled",
          title: "Ofertă de ajutor anulată",
          message: `${offer.helper.fullName} a anulat oferta de ajutor. Motiv: ${action === "no_help_wanted" ? "Nu vrea ajutor" : action === "different_help" ? "Ajutor diferit de postare" : "Raport trimis"}`,
        },
      });

      appendAuditLog({
        type: "help_offer_cancelled",
        actorUserId: userId,
        message: `Ofertă anulată de helper: ${action}`,
        metadata: { offerId, action, note },
      });

      return successResponse({ cancelled: true }, "Oferta a fost anulată");
    }

    return errorResponse("Acțiune invalidă", 400);
  } catch (error) {
    console.error("Error updating help offer:", error);
    return errorResponse("Eroare la actualizarea ofertei", 500);
  }
}
