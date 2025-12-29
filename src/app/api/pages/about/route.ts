import { successResponse, errorResponse } from "@/lib/api/response";
import { adminDatabase } from "@/lib/admin/config";

export async function GET() {
  try {
    const about = adminDatabase.pages.about;
    return successResponse({ about });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
