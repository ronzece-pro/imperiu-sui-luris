import { NextRequest } from "next/server";
import { mockDatabase } from "@/lib/db/config";
import { getAuthTokenFromRequest, verifyToken } from "@/lib/auth/utils";
import { successResponse, errorResponse, authErrorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (postId) {
      // Get specific post
      const post = mockDatabase.feedPosts.find((p) => p.id === postId);
      if (!post) {
        return errorResponse("Post not found", 404);
      }
      return successResponse(post);
    }

    // Get all feed posts (most recent first)
    const feed = [...mockDatabase.feedPosts].reverse();
    return successResponse(feed);
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return authErrorResponse();
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return authErrorResponse();
    }

    const { content, images, action, postId } = await request.json();

    // Check if user is admin (only admin can post)
    const user = mockDatabase.users.find((u) => u.id === decoded.userId);
    if (user?.id !== "user_admin") {
      return errorResponse("Only administrators can create posts", 403);
    }

    if (action === "create") {
      if (!content || content.trim().length === 0) {
        return errorResponse("Content is required", 400);
      }

      const newPost = {
        id: `feed_${Date.now()}`,
        authorId: decoded.userId,
        content,
        images: images || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 0,
        comments: [],
      };

      mockDatabase.feedPosts.push(newPost);
      return successResponse(newPost, "Post created successfully", 201);
    } else if (action === "like") {
      const post = mockDatabase.feedPosts.find((p) => p.id === postId);
      if (!post) {
        return errorResponse("Post not found", 404);
      }

      post.likes += 1;
      return successResponse(post, "Post liked");
    } else if (action === "comment") {
      const body = await request.json();
      const text = body.text || body.content;
      const post = mockDatabase.feedPosts.find((p) => p.id === postId);
      if (!post) {
        return errorResponse("Post not found", 404);
      }

      const comment: any = {
        id: `comment_${Date.now()}`,
        postId,
        authorId: decoded.userId,
        content: text,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (post.comments as any).push(comment);
      return successResponse(post, "Comment added", 201);
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
