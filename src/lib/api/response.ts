import { NextResponse } from "next/server";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export function successResponse<T>(data: T, message?: string, statusCode = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message || "Request successful",
      statusCode,
    },
    { status: statusCode }
  );
}

export function errorResponse(error: string, statusCode = 400, headers?: HeadersInit): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      statusCode,
    },
    { status: statusCode, headers }
  );
}

export function authErrorResponse(): NextResponse {
  return errorResponse("Unauthorized - Invalid or missing token", 401);
}

export function notFoundResponse(resource: string): NextResponse {
  return errorResponse(`${resource} not found`, 404);
}
