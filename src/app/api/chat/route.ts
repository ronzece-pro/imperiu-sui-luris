import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { errorResponse, successResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

// GET /api/chat?roomId=xxx - Get messages from a chat room
export async function GET(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return errorResponse("roomId is required", 400);
    }

    // Find the room and verify user has access
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return errorResponse("Chat room not found", 404);
    }

    // Only participants can access the room
    if (room.userId1 !== userId && room.userId2 !== userId) {
      return errorResponse("Access denied", 403);
    }

    // Get messages with sender info
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return successResponse({
      room,
      messages: messages.map((m) => ({
        id: m.id,
        text: m.text,
        senderId: m.senderId,
        createdAt: m.createdAt.toISOString(),
        sender: m.sender,
      })),
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/chat - Send message to a chat room
export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const body = await request.json();
    const { roomId, text } = body;

    if (!roomId) {
      return errorResponse("roomId is required", 400);
    }

    if (!text || !text.trim()) {
      return errorResponse("Message text is required", 400);
    }

    // Find the room and verify user has access
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return errorResponse("Chat room not found", 404);
    }

    // Only participants can send messages
    if (room.userId1 !== userId && room.userId2 !== userId) {
      return errorResponse("Access denied", 403);
    }

    // Check if the help offer is still active
    if (room.type === "help_offer") {
      const offer = await prisma.helpOffer.findFirst({
        where: { chatRoomId: roomId },
      });

      if (offer && (offer.status === "confirmed" || offer.status === "not_confirmed" || offer.status === "cancelled")) {
        return errorResponse("Acest chat a fost închis", 400);
      }
    }

    // Create the message
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        text: text.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            isVerified: true,
          },
        },
      },
    });

    // Determine the other user for notification
    const otherUserId = room.userId1 === userId ? room.userId2 : room.userId1;

    // Create notification for the other user (if there is one)
    if (otherUserId) {
      await prisma.notification.create({
        data: {
          userId: otherUserId,
          type: "chat_message",
          title: "Mesaj nou în chat",
          message: `${authed.user?.fullName || "Un utilizator"}: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
        },
      });
    }

    return successResponse(
      {
        message: {
          id: message.id,
          text: message.text,
          senderId: message.senderId,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender,
        },
      },
      "Message sent",
      201
    );
  } catch (error) {
    console.error("Error sending chat message:", error);
    return errorResponse("Internal server error", 500);
  }
}
