import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_HELP_CATEGORIES } from "@/types/help";

// GET /api/help/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const withCount = searchParams.get("withCount") === "true";

    const categories = await prisma.helpCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      ...(withCount && {
        include: {
          _count: {
            select: { posts: { where: { isActive: true, status: "open" } } },
          },
        },
      }),
    });

    // If no categories exist, seed with defaults
    if (categories.length === 0) {
      const seeded = await seedDefaultCategories();
      return successResponse(seeded, "Categorii create cu succes");
    }

    return successResponse(categories);
  } catch (error) {
    console.error("Error fetching help categories:", error);
    return errorResponse("Eroare la încărcarea categoriilor", 500);
  }
}

// POST /api/help/categories - Create new category (admin or auto-create)
export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    const body = await request.json();
    const { name, icon, description, color, isAdmin } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return errorResponse("Numele categoriei este obligatoriu (min 2 caractere)", 400);
    }

    const trimmedName = name.trim();
    const slug = generateSlug(trimmedName);

    // Check if category already exists
    const existing = await prisma.helpCategory.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName, mode: "insensitive" } },
          { slug },
        ],
      },
    });

    if (existing) {
      return successResponse(existing, "Categoria există deja");
    }

    // Only admins can set isDefault or sortOrder
    const isAdminUser = authed.user?.role === "admin";

    const category = await prisma.helpCategory.create({
      data: {
        name: trimmedName,
        slug,
        icon: icon || "📦",
        description: description || null,
        color: color || "#6B7280",
        isDefault: false,
        isActive: true,
        sortOrder: isAdminUser && body.sortOrder ? body.sortOrder : 999,
      },
    });

    appendAuditLog({
      type: "help_category_created",
      actorUserId: userId,
      message: `Categorie nouă creată: ${trimmedName}`,
      metadata: { categoryId: category.id, slug, isAdmin: isAdminUser },
    });

    return successResponse(category, "Categoria a fost creată", 201);
  } catch (error) {
    console.error("Error creating help category:", error);
    return errorResponse("Eroare la crearea categoriei", 500);
  }
}

// PUT /api/help/categories - Update category (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    if (authed.user?.role !== "admin") {
      return errorResponse("Acces interzis - doar administratorii", 403);
    }

    const { userId } = authed.decoded;
    const body = await request.json();
    const { id, name, icon, description, color, isActive, sortOrder } = body;

    if (!id) {
      return errorResponse("ID-ul categoriei este obligatoriu", 400);
    }

    const existing = await prisma.helpCategory.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Categoria nu există", 404);
    }

    const updateData: Record<string, unknown> = {};
    
    if (name && typeof name === "string" && name.trim().length >= 2) {
      updateData.name = name.trim();
      updateData.slug = generateSlug(name.trim());
    }
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;

    const category = await prisma.helpCategory.update({
      where: { id },
      data: updateData,
    });

    appendAuditLog({
      type: "help_category_updated",
      actorUserId: userId,
      message: `Categorie actualizată: ${category.name}`,
      metadata: { categoryId: id, changes: Object.keys(updateData) },
    });

    return successResponse(category, "Categoria a fost actualizată");
  } catch (error) {
    console.error("Error updating help category:", error);
    return errorResponse("Eroare la actualizarea categoriei", 500);
  }
}

// DELETE /api/help/categories - Delete category (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;

    if (authed.user?.role !== "admin") {
      return errorResponse("Acces interzis - doar administratorii", 403);
    }

    const { userId } = authed.decoded;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("ID-ul categoriei este obligatoriu", 400);
    }

    const existing = await prisma.helpCategory.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });

    if (!existing) {
      return errorResponse("Categoria nu există", 404);
    }

    // Don't delete if has posts - soft delete instead
    if (existing._count.posts > 0) {
      await prisma.helpCategory.update({
        where: { id },
        data: { isActive: false },
      });

      appendAuditLog({
        type: "help_category_deactivated",
        actorUserId: userId,
        message: `Categorie dezactivată (avea ${existing._count.posts} postări): ${existing.name}`,
        metadata: { categoryId: id, postsCount: existing._count.posts },
      });

      return successResponse({ deactivated: true }, "Categoria a fost dezactivată (avea postări active)");
    }

    await prisma.helpCategory.delete({ where: { id } });

    appendAuditLog({
      type: "help_category_deleted",
      actorUserId: userId,
      message: `Categorie ștearsă: ${existing.name}`,
      metadata: { categoryId: id },
    });

    return successResponse({ deleted: true }, "Categoria a fost ștearsă");
  } catch (error) {
    console.error("Error deleting help category:", error);
    return errorResponse("Eroare la ștergerea categoriei", 500);
  }
}

// Helper functions
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedDefaultCategories() {
  const categories = [];
  
  for (let i = 0; i < DEFAULT_HELP_CATEGORIES.length; i++) {
    const cat = DEFAULT_HELP_CATEGORIES[i];
    const category = await prisma.helpCategory.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        description: cat.description,
        sortOrder: i,
        isDefault: true,
        isActive: true,
      },
    });
    categories.push(category);
  }

  appendAuditLog({
    type: "help_categories_seeded",
    actorUserId: "system",
    message: `${categories.length} categorii implicite create`,
    metadata: { count: categories.length },
  });

  return categories;
}
