import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api/response";
import { adminDatabase } from "@/lib/admin/config";

export async function GET(_request: NextRequest) {
  try {
    const about = (adminDatabase as any)?.pages?.about;
    return successResponse({ about });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
