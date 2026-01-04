import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { prisma } from "@/lib/db/prisma";
import { isUserVerified } from "@/lib/users/verification";

// POST /api/help/posts/[id]/offer - Create help offer/request (opens chat)
// For "request" posts: someone offers to help the author
// For "offer" posts: someone requests help from the author
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId: responderId } = authed.decoded;

    // Only verified users can respond
    if (!isUserVerified(authed.user)) {
      return errorResponse("Doar utilizatorii verificați pot răspunde", 403);
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
      return errorResponse("Această cerere nu mai este activă", 400);
    }

    // Can't respond to your own post
    if (post.authorId === responderId) {
      return errorResponse("Nu poți răspunde la propria postare", 400);
    }

    // Determine roles based on postType
    // For "request" posts: author is requester, responder is helper
    // For "offer" posts: author is helper, responder is requester
    const isOfferPost = post.postType === "offer";
    const helperId = isOfferPost ? post.authorId : responderId;
    const requesterId = isOfferPost ? responderId : post.authorId;

    // Check if this responder already has an active offer/request for this post
    const existingOffer = await prisma.helpOffer.findFirst({
      where: {
        postId,
        OR: [
          { helperId: responderId },
          { requesterId: responderId },
        ],
        status: { in: ["pending", "accepted"] },
      },
    });

    if (existingOffer) {
      return errorResponse(
        isOfferPost 
          ? "Ai solicitat deja ajutor pentru această ofertă" 
          : "Ai oferit deja ajutor pentru această cerere", 
        400
      );
    }

    // Create a dedicated chat room for this help interaction
    const chatRoom = await prisma.chatRoom.create({
      data: {
        type: "help_offer",
        name: `Ajutor: ${post.title.substring(0, 50)}`,
        userId1: responderId,
        userId2: post.authorId,
      },
    });

    // Create the help offer/request
    const offer = await prisma.helpOffer.create({
      data: {
        postId,
        helperId,
        requesterId,
        status: "accepted", // Auto-accept since multiple interactions are allowed
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
          senderId: responderId,
          text: message.trim(),
        },
      });
    }

    // Update post status to in_progress if it's the first response
    if (post.status === "open") {
      await prisma.helpPost.update({
        where: { id: postId },
        data: { status: "in_progress" },
      });
    }

    // Notify post author about the response
    const notificationTitle = isOfferPost 
      ? "Cineva are nevoie de ajutorul tău!" 
      : "Cineva vrea să te ajute!";
    const notificationMessage = isOfferPost
      ? `${authed.user?.fullName || "Un utilizator"} solicită ajutor pentru oferta ta: "${post.title}"`
      : `${authed.user?.fullName || "Un utilizator"} oferă ajutor pentru cererea ta: "${post.title}"`;

    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: "help_offer",
        title: notificationTitle,
        message: notificationMessage,
      },
    });

    // Initialize or get stats for the helper
    await prisma.helpStats.upsert({
      where: { userId: helperId },
      update: {},
      create: { userId: helperId },
    });

    const auditMessage = isOfferPost
      ? `Solicitare de ajutor pentru oferta: ${post.title}`
      : `Ofertă de ajutor pentru cererea: ${post.title}`;

    appendAuditLog({
      type: "help_offer_created",
      actorUserId: responderId,
      message: auditMessage,
      metadata: { postId, offerId: offer.id, chatRoomId: chatRoom.id, postType: post.postType },
    });

    const successMessage = isOfferPost
      ? "Solicitarea ta a fost trimisă. Chat-ul a fost deschis."
      : "Oferta de ajutor a fost trimisă. Chat-ul a fost deschis.";

    return successResponse(
      {
        offer,
        chatRoomId: chatRoom.id,
      },
      successMessage,
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
