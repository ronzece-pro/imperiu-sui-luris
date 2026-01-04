import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { prisma } from "@/lib/db/prisma";
import { isUserVerified } from "@/lib/users/verification";

// POST /api/help/posts/[id]/offer - Create help offer (opens chat)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId: helperId } = authed.decoded;

    // Only verified users can offer help
    if (!isUserVerified(authed.user)) {
      return errorResponse("Doar utilizatorii verificați pot oferi ajutor", 403);
    }

    const { id: postId } = await params;
    const body = await request.json();
    const { message } = body;

    // Get post with author
    const post = await prisma.helpPost.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!post || !post.isActive) {
      return errorResponse("Postarea nu există", 404);
    }

    if (post.status === "completed" || post.status === "closed") {
      return errorResponse("Această cerere de ajutor nu mai este activă", 400);
    }

    // Can't offer help to yourself
    if (post.authorId === helperId) {
      return errorResponse("Nu poți oferi ajutor la propria postare", 400);
    }

    // Check if already offering help
    const existingOffer = await prisma.helpOffer.findFirst({
      where: {
        postId,
        helperId,
        status: { in: ["pending", "accepted"] },
      },
    });

    if (existingOffer) {
      return errorResponse("Ai oferit deja ajutor pentru această cerere", 400);
    }

    // Create a dedicated chat room for this help offer
    const chatRoom = await prisma.chatRoom.create({
      data: {
        type: "help_offer",
        name: `Ajutor: ${post.title.substring(0, 50)}`,
        userId1: helperId,
        userId2: post.authorId,
      },
    });

    // Create the help offer
    const offer = await prisma.helpOffer.create({
      data: {
        postId,
        helperId,
        requesterId: post.authorId,
        status: "accepted", // Auto-accept since multiple helpers are allowed
        chatRoomId: chatRoom.id,
        acceptedAt: new Date(),
      },
      include: {
        helper: {
          select: {
            id: true,
            username: true,
            fullName: true,
            isVerified: true,
            badge: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Send initial message if provided
    if (message && message.trim()) {
      await prisma.chatMessage.create({
        data: {
          roomId: chatRoom.id,
          senderId: helperId,
          text: message.trim(),
        },
      });
    }

    // Update post status to in_progress if it's the first offer
    if (post.status === "open") {
      await prisma.helpPost.update({
        where: { id: postId },
        data: { status: "in_progress" },
      });
    }

    // Notify post author
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: "help_offer",
        title: "Cineva vrea să te ajute!",
        message: `${authed.user?.fullName || "Un utilizator"} oferă ajutor pentru cererea ta: "${post.title}"`,
      },
    });

    // Initialize or get helper stats
    await prisma.helpStats.upsert({
      where: { userId: helperId },
      update: {},
      create: { userId: helperId },
    });

    appendAuditLog({
      type: "help_offer_created",
      actorUserId: helperId,
      message: `Ofertă de ajutor creată pentru: ${post.title}`,
      metadata: { postId, offerId: offer.id, chatRoomId: chatRoom.id },
    });

    return successResponse(
      {
        offer,
        chatRoomId: chatRoom.id,
      },
      "Oferta de ajutor a fost trimisă. Chat-ul a fost deschis.",
      201
    );
  } catch (error) {
    console.error("Error creating help offer:", error);
    return errorResponse("Eroare la crearea ofertei de ajutor", 500);
  }
}

// GET /api/help/posts/[id]/offer - Get offers for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const { id: postId } = await params;

    const post = await prisma.helpPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return errorResponse("Postarea nu există", 404);
    }

    // Only post author or admin can see all offers
    const isAuthor = post.authorId === userId;
    const isAdmin = authed.user?.role === "admin";

    const where: Record<string, unknown> = { postId };

    // Non-authors can only see their own offer
    if (!isAuthor && !isAdmin) {
      where.helperId = userId;
    }

    const offers = await prisma.helpOffer.findMany({
      where,
      include: {
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
      orderBy: { createdAt: "desc" },
    });

    return successResponse(offers);
  } catch (error) {
    console.error("Error fetching help offers:", error);
    return errorResponse("Eroare la încărcarea ofertelor", 500);
  }
}
