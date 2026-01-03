import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { prisma } from "@/lib/db/prisma";

// GET /api/help/posts/[id] - Get single post with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.helpPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            isVerified: true,
            badge: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
        comments: {
          where: { isHidden: false, parentId: null },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                fullName: true,
                isVerified: true,
                badge: true,
              },
            },
            replies: {
              where: { isHidden: false },
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    isVerified: true,
                    badge: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        offers: {
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
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            comments: { where: { isHidden: false } },
            likes: true,
            offers: true,
          },
        },
      },
    });

    if (!post || !post.isActive) {
      return errorResponse("Postarea nu există", 404);
    }

    // Increment view count
    await prisma.helpPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return successResponse(post);
  } catch (error) {
    console.error("Error fetching help post:", error);
    return errorResponse("Eroare la încărcarea postării", 500);
  }
}

// POST /api/help/posts/[id]/like - Like/unlike post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const { id: postId } = await params;
    const body = await request.json();
    const { action } = body; // "like" | "unlike" | "report"

    // Verify post exists
    const post = await prisma.helpPost.findUnique({ where: { id: postId } });
    if (!post || !post.isActive) {
      return errorResponse("Postarea nu există", 404);
    }

    if (action === "like") {
      // Check if already liked
      const existing = await prisma.helpLike.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existing) {
        return successResponse({ liked: true }, "Ai apreciat deja această postare");
      }

      await prisma.helpLike.create({
        data: { postId, userId },
      });

      const likeCount = await prisma.helpLike.count({ where: { postId } });
      return successResponse({ liked: true, likeCount }, "Postare apreciată");
    }

    if (action === "unlike") {
      await prisma.helpLike.deleteMany({
        where: { postId, userId },
      });

      const likeCount = await prisma.helpLike.count({ where: { postId } });
      return successResponse({ liked: false, likeCount }, "Apreciere eliminată");
    }

    if (action === "report") {
      const { reason, description } = body;

      if (!reason || !["spam", "scam", "inappropriate", "other"].includes(reason)) {
        return errorResponse("Motivul raportării este obligatoriu", 400);
      }

      // Check if already reported by this user
      const existingReport = await prisma.helpReport.findFirst({
        where: { reporterId: userId, postId },
      });

      if (existingReport) {
        return errorResponse("Ai raportat deja această postare", 400);
      }

      await prisma.helpReport.create({
        data: {
          reporterId: userId,
          postId,
          reason,
          description: description?.trim() || null,
        },
      });

      appendAuditLog({
        type: "help_post_reported",
        actorUserId: userId,
        message: `Postare raportată: ${post.title}`,
        metadata: { postId, reason },
      });

      return successResponse({ reported: true }, "Raportul a fost trimis");
    }

    return errorResponse("Acțiune invalidă", 400);
  } catch (error) {
    console.error("Error on post action:", error);
    return errorResponse("Eroare la procesarea acțiunii", 500);
  }
}
