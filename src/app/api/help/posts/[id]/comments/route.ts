import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { prisma } from "@/lib/db/prisma";
import type { CreateHelpCommentRequest } from "@/types/help";

// GET /api/help/posts/[id]/comments - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    const comments = await prisma.helpComment.findMany({
      where: {
        postId,
        isHidden: false,
        parentId: parentId || null,
      },
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
        _count: {
          select: { replies: { where: { isHidden: false } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return errorResponse("Eroare la încărcarea comentariilor", 500);
  }
}

// POST /api/help/posts/[id]/comments - Add comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    // Only verified users can comment
    if (!authed.user?.isVerified) {
      return errorResponse("Doar utilizatorii verificați pot comenta", 403);
    }

    const { id: postId } = await params;

    // Verify post exists
    const post = await prisma.helpPost.findUnique({ where: { id: postId } });
    if (!post || !post.isActive) {
      return errorResponse("Postarea nu există", 404);
    }

    const body: CreateHelpCommentRequest = await request.json();
    const { text, images, parentId } = body;

    if (!text || text.trim().length < 2) {
      return errorResponse("Comentariul este obligatoriu (min 2 caractere)", 400);
    }

    // If replying, verify parent comment exists
    if (parentId) {
      const parentComment = await prisma.helpComment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.postId !== postId) {
        return errorResponse("Comentariul părinte nu există", 400);
      }
    }

    const comment = await prisma.helpComment.create({
      data: {
        postId,
        authorId: userId,
        text: text.trim(),
        images: images || [],
        parentId: parentId || null,
      },
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
    });

    // Notify post author if comment is from someone else
    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "help_comment",
          title: "Comentariu nou",
          message: `${authed.user?.fullName || "Cineva"} a comentat la postarea ta: "${post.title}"`,
        },
      });
    }

    appendAuditLog({
      type: "help_comment_created",
      actorUserId: userId,
      message: `Comentariu adăugat la postarea: ${post.title}`,
      metadata: { postId, commentId: comment.id, isReply: !!parentId },
    });

    return successResponse(comment, "Comentariu adăugat", 201);
  } catch (error) {
    console.error("Error creating comment:", error);
    return errorResponse("Eroare la adăugarea comentariului", 500);
  }
}

// DELETE /api/help/posts/[id]/comments - Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;
    const isAdmin = authed.user?.role === "admin";

    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return errorResponse("ID-ul comentariului este obligatoriu", 400);
    }

    const comment = await prisma.helpComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.postId !== postId) {
      return errorResponse("Comentariul nu există", 404);
    }

    // Only author or admin can delete
    if (comment.authorId !== userId && !isAdmin) {
      return errorResponse("Nu ai permisiunea să ștergi acest comentariu", 403);
    }

    // Soft delete by hiding
    await prisma.helpComment.update({
      where: { id: commentId },
      data: { isHidden: true },
    });

    appendAuditLog({
      type: "help_comment_deleted",
      actorUserId: userId,
      message: `Comentariu șters`,
      metadata: { postId, commentId, isAdmin },
    });

    return successResponse({ deleted: true }, "Comentariu șters");
  } catch (error) {
    console.error("Error deleting comment:", error);
    return errorResponse("Eroare la ștergerea comentariului", 500);
  }
}

// PUT /api/help/posts/[id]/comments - Report comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const { id: postId } = await params;
    const body = await request.json();
    const { commentId, action, reason, description } = body;

    if (!commentId) {
      return errorResponse("ID-ul comentariului este obligatoriu", 400);
    }

    const comment = await prisma.helpComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.postId !== postId) {
      return errorResponse("Comentariul nu există", 404);
    }

    if (action === "report") {
      if (!reason || !["spam", "scam", "inappropriate", "other"].includes(reason)) {
        return errorResponse("Motivul raportării este obligatoriu", 400);
      }

      // Check if already reported
      const existingReport = await prisma.helpReport.findFirst({
        where: { reporterId: userId, commentId },
      });

      if (existingReport) {
        return errorResponse("Ai raportat deja acest comentariu", 400);
      }

      await prisma.helpReport.create({
        data: {
          reporterId: userId,
          commentId,
          reason,
          description: description?.trim() || null,
        },
      });

      appendAuditLog({
        type: "help_comment_reported",
        actorUserId: userId,
        message: `Comentariu raportat`,
        metadata: { postId, commentId, reason },
      });

      return successResponse({ reported: true }, "Raportul a fost trimis");
    }

    return errorResponse("Acțiune invalidă", 400);
  } catch (error) {
    console.error("Error on comment action:", error);
    return errorResponse("Eroare la procesarea acțiunii", 500);
  }
}
