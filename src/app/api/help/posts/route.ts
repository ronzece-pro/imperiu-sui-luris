import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { prisma } from "@/lib/db/prisma";
import { getHelpSettings } from "@/lib/help/settings";
import { isUserVerified } from "@/lib/users/verification";
import { isHardcodedCategoryId, getHardcodedCategoryById, getSlugFromHardcodedId, HARDCODED_CATEGORIES } from "@/lib/help/categories";
import { DEFAULT_HELP_CATEGORIES } from "@/types/help";
import type { CreateHelpPostRequest, HelpPostStatus } from "@/types/help";

// GET /api/help/posts - List posts with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const categorySlug = searchParams.get("category");
    const status = searchParams.get("status") as HelpPostStatus | null;
    const location = searchParams.get("location");
    const urgency = searchParams.get("urgency");
    const authorId = searchParams.get("authorId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const skip = (page - 1) * limit;

    try {
      // Build where clause
      const where: Record<string, unknown> = {
        isActive: true,
      };

      if (categorySlug) {
        const category = await prisma.helpCategory.findUnique({
          where: { slug: categorySlug },
        });
        if (category) {
          where.categoryId = category.id;
        }
      }

      if (status) {
        where.status = status;
      } else {
        // Default: show open posts
        where.status = { in: ["open", "in_progress"] };
      }

      if (location) {
        where.location = { contains: location, mode: "insensitive" };
      }

      if (urgency) {
        where.urgency = urgency;
      }

      if (authorId) {
        where.authorId = authorId;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.helpPost.findMany({
          where,
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
            _count: {
              select: {
                comments: { where: { isHidden: false } },
                likes: true,
                offers: true,
              },
            },
          },
          orderBy: [
            { urgency: "desc" }, // urgent first
            { createdAt: "desc" },
          ],
          skip,
          take: limit,
        }),
        prisma.helpPost.count({ where }),
      ]);

      return successResponse({
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (dbError) {
      // Database error - return empty posts (tables might not exist yet)
      console.log("Database error fetching posts, returning empty:", dbError);
      return successResponse({
        posts: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching help posts:", error);
    return successResponse({
      posts: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
  }
}

// POST /api/help/posts - Create new post
export async function POST(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;

    // Check if user is verified (permanent or temporary via visitor certificate)
    if (!isUserVerified(authed.user)) {
      return errorResponse("Doar utilizatorii verificați pot posta cereri de ajutor", 403);
    }

    const settings = await getHelpSettings();
    
    // Check cooldown
    const lastPost = await prisma.helpPost.findFirst({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
    });

    if (lastPost) {
      const cooldownMs = settings.postCooldownMinutes * 60 * 1000;
      const timeSinceLastPost = Date.now() - new Date(lastPost.createdAt).getTime();
      
      if (timeSinceLastPost < cooldownMs) {
        const minutesLeft = Math.ceil((cooldownMs - timeSinceLastPost) / 60000);
        return errorResponse(`Trebuie să aștepți ${minutesLeft} minute între postări`, 429);
      }
    }

    // Check max active posts
    const activePostsCount = await prisma.helpPost.count({
      where: {
        authorId: userId,
        isActive: true,
        status: { in: ["open", "in_progress"] },
      },
    });

    if (activePostsCount >= settings.maxActivePostsPerUser) {
      return errorResponse(`Poți avea maximum ${settings.maxActivePostsPerUser} cereri active simultan`, 400);
    }

    const body: CreateHelpPostRequest = await request.json();
    const { categoryId, categoryName, title, description, images, location, urgency, fromLocation, toLocation, vehicleType, seats } = body;

    // Validate required fields
    if (!title || title.trim().length < 5) {
      return errorResponse("Titlul este obligatoriu (min 5 caractere)", 400);
    }
    if (!description || description.trim().length < 20) {
      return errorResponse("Descrierea este obligatorie (min 20 caractere)", 400);
    }

    // Get or create category - handle hardcoded categories
    let finalCategoryId: string | null = null;
    
    if (categoryId) {
      // Check if it's a hardcoded category ID (cat_transport, cat_alimente, etc)
      if (isHardcodedCategoryId(categoryId)) {
        const hardcodedCat = getHardcodedCategoryById(categoryId);
        if (!hardcodedCat) {
          return errorResponse("Categoria nu există", 400);
        }
        
        // Try to find or create this category in database
        try {
          let dbCategory = await prisma.helpCategory.findFirst({
            where: { slug: hardcodedCat.slug },
          });
          
          if (!dbCategory) {
            // Create the category in database from hardcoded definition
            const defaultCat = DEFAULT_HELP_CATEGORIES.find(c => c.slug === hardcodedCat.slug);
            dbCategory = await prisma.helpCategory.create({
              data: {
                name: defaultCat?.name || hardcodedCat.name,
                slug: hardcodedCat.slug,
                icon: defaultCat?.icon || hardcodedCat.icon,
                color: defaultCat?.color || hardcodedCat.color,
                description: defaultCat?.description || hardcodedCat.description,
                isDefault: true,
                isActive: true,
                sortOrder: hardcodedCat.sortOrder,
              },
            });
          }
          
          finalCategoryId = dbCategory.id;
        } catch (dbError) {
          console.error("Error creating category from hardcoded:", dbError);
          return errorResponse("Eroare la crearea categoriei. Baza de date nu este disponibilă.", 500);
        }
      } else {
        // Regular database category ID
        finalCategoryId = categoryId;
      }
    } else if (categoryName) {
      // Auto-create new category from user input
      const slug = categoryName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      try {
        let category = await prisma.helpCategory.findFirst({
          where: {
            OR: [
              { name: { equals: categoryName.trim(), mode: "insensitive" } },
              { slug },
            ],
          },
        });

        if (!category) {
          category = await prisma.helpCategory.create({
            data: {
              name: categoryName.trim(),
              slug,
              icon: "📦",
              color: "#6B7280",
              isDefault: false,
              isActive: true,
              sortOrder: 999,
            },
          });

          appendAuditLog({
            type: "help_category_auto_created",
            actorUserId: userId,
            message: `Categorie nouă auto-creată: ${categoryName}`,
            metadata: { categoryId: category.id },
          });
        }

        finalCategoryId = category.id;
      } catch (dbError) {
        console.error("Error creating custom category:", dbError);
        return errorResponse("Eroare la crearea categoriei. Baza de date nu este disponibilă.", 500);
      }
    }

    if (!finalCategoryId) {
      return errorResponse("Categoria este obligatorie", 400);
    }

    // Verify category exists in database
    try {
      const category = await prisma.helpCategory.findUnique({
        where: { id: finalCategoryId },
      });

      if (!category || !category.isActive) {
        return errorResponse("Categoria nu există sau nu este activă", 400);
      }
    } catch {
      return errorResponse("Eroare la verificarea categoriei", 500);
    }

    // Create post
    try {
      const post = await prisma.helpPost.create({
        data: {
          authorId: userId,
          categoryId: finalCategoryId,
          title: title.trim(),
          description: description.trim(),
          images: images || [],
          location: location?.trim() || null,
          urgency: urgency || "normal",
          fromLocation: fromLocation?.trim() || null,
          toLocation: toLocation?.trim() || null,
          vehicleType: vehicleType?.trim() || null,
          seats: seats || null,
          status: "open",
          isActive: true,
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
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          },
        },
      });

      appendAuditLog({
        type: "help_post_created",
        actorUserId: userId,
        message: `Postare ajutor creată: ${title}`,
        metadata: { postId: post.id, categoryId: finalCategoryId, urgency },
      });

      return successResponse(post, "Postarea a fost creată", 201);
    } catch (postError) {
      console.error("Error creating post in database:", postError);
      return errorResponse("Eroare la crearea postării. Baza de date nu este disponibilă.", 500);
    }
  } catch (error) {
    console.error("Error creating help post:", error);
    return errorResponse("Eroare la crearea postării", 500);
  }
}

// PUT /api/help/posts - Update post (author or admin)
export async function PUT(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;
    const isAdmin = authed.user?.role === "admin";

    const body = await request.json();
    const { id, title, description, images, location, urgency, status, fromLocation, toLocation, vehicleType, seats, isActive } = body;

    if (!id) {
      return errorResponse("ID-ul postării este obligatoriu", 400);
    }

    const post = await prisma.helpPost.findUnique({ where: { id } });
    
    if (!post) {
      return errorResponse("Postarea nu există", 404);
    }

    // Only author or admin can edit
    if (post.authorId !== userId && !isAdmin) {
      return errorResponse("Nu ai permisiunea să editezi această postare", 403);
    }

    const updateData: Record<string, unknown> = {};

    // Author can edit these
    if (title && title.trim().length >= 5) updateData.title = title.trim();
    if (description && description.trim().length >= 20) updateData.description = description.trim();
    if (images !== undefined) updateData.images = images;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (urgency) updateData.urgency = urgency;
    if (fromLocation !== undefined) updateData.fromLocation = fromLocation?.trim() || null;
    if (toLocation !== undefined) updateData.toLocation = toLocation?.trim() || null;
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType?.trim() || null;
    if (seats !== undefined) updateData.seats = seats;

    // Only author can close their own post, or admin can do anything
    if (status && (post.authorId === userId || isAdmin)) {
      updateData.status = status;
    }

    // Only admin can deactivate
    if (typeof isActive === "boolean" && isAdmin) {
      updateData.isActive = isActive;
    }

    const updated = await prisma.helpPost.update({
      where: { id },
      data: updateData,
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
        category: true,
      },
    });

    appendAuditLog({
      type: "help_post_updated",
      actorUserId: userId,
      message: `Postare actualizată: ${updated.title}`,
      metadata: { postId: id, changes: Object.keys(updateData), isAdmin },
    });

    return successResponse(updated, "Postarea a fost actualizată");
  } catch (error) {
    console.error("Error updating help post:", error);
    return errorResponse("Eroare la actualizarea postării", 500);
  }
}

// DELETE /api/help/posts - Delete post (author or admin)
export async function DELETE(request: NextRequest) {
  try {
    const authed = requireAuthenticatedUser(request);
    if (!authed.ok) return authed.response;
    const { userId } = authed.decoded;
    const isAdmin = authed.user?.role === "admin";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("ID-ul postării este obligatoriu", 400);
    }

    const post = await prisma.helpPost.findUnique({ where: { id } });

    if (!post) {
      return errorResponse("Postarea nu există", 404);
    }

    if (post.authorId !== userId && !isAdmin) {
      return errorResponse("Nu ai permisiunea să ștergi această postare", 403);
    }

    // Soft delete - just mark as inactive
    await prisma.helpPost.update({
      where: { id },
      data: { isActive: false, status: "closed" },
    });

    appendAuditLog({
      type: "help_post_deleted",
      actorUserId: userId,
      message: `Postare ștearsă: ${post.title}`,
      metadata: { postId: id, isAdmin },
    });

    return successResponse({ deleted: true }, "Postarea a fost ștearsă");
  } catch (error) {
    console.error("Error deleting help post:", error);
    return errorResponse("Eroare la ștergerea postării", 500);
  }
}
