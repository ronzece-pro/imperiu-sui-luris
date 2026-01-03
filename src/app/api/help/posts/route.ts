import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { appendAuditLog } from "@/lib/audit/persistence";
import { getHelpSettings } from "@/lib/help/settings";
import { isUserVerified } from "@/lib/users/verification";
import { isHardcodedCategoryId, getHardcodedCategoryById, HARDCODED_CATEGORIES } from "@/lib/help/categories";
import { DEFAULT_HELP_CATEGORIES } from "@/types/help";
import { shouldUseMockStorage, getMockPosts, createMockPost, createMockCategory } from "@/lib/help/mock-storage";
import type { CreateHelpPostRequest, HelpPostStatus } from "@/types/help";

// Lazy load prisma only when needed
async function getPrisma() {
  if (shouldUseMockStorage()) {
    return null;
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}

// Ensure mock user exists in Prisma database for Help System relations
async function ensurePrismaUser(prisma: Awaited<ReturnType<typeof getPrisma>>, mockUser: {
  id: string;
  email: string;
  username: string;
  fullName: string;
  isVerified?: boolean;
  badge?: string;
  role?: string;
}): Promise<void> {
  if (!prisma) return; // Mock mode, no need to sync
  
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: mockUser.id },
    });
    
    if (!existingUser) {
      try {
        await prisma.user.create({
          data: {
            id: mockUser.id,
            email: mockUser.email,
            username: mockUser.username,
            fullName: mockUser.fullName,
            passwordHash: "mock-user-synced",
            isVerified: mockUser.isVerified ?? false,
            badge: mockUser.badge ?? "citizen",
            role: mockUser.role ?? "user",
          },
        });
      } catch (createError: unknown) {
        const err = createError as { code?: string };
        if (err.code === "P2002") {
          await prisma.user.upsert({
            where: { email: mockUser.email },
            update: {
              fullName: mockUser.fullName,
              isVerified: mockUser.isVerified ?? false,
              badge: mockUser.badge ?? "citizen",
            },
            create: {
              id: mockUser.id,
              email: mockUser.email,
              username: mockUser.username,
              fullName: mockUser.fullName,
              passwordHash: "mock-user-synced",
              isVerified: mockUser.isVerified ?? false,
              badge: mockUser.badge ?? "citizen",
              role: mockUser.role ?? "user",
            },
          });
        } else {
          throw createError;
        }
      }
    } else {
      await prisma.user.update({
        where: { id: mockUser.id },
        data: {
          fullName: mockUser.fullName,
          isVerified: mockUser.isVerified ?? existingUser.isVerified,
          badge: mockUser.badge ?? existingUser.badge,
        },
      });
    }
  } catch (error) {
    console.error("Error syncing mock user to Prisma:", error);
  }
}

// GET /api/help/posts - List posts with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const categorySlug = searchParams.get("category");
    const status = searchParams.get("status") as HelpPostStatus | null;
    const authorId = searchParams.get("authorId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    // Use mock storage if no DATABASE_URL
    if (shouldUseMockStorage()) {
      const { posts, total } = getMockPosts({
        categorySlug: categorySlug || undefined,
        status: status || "open,in_progress",
        authorId: authorId || undefined,
        search: search || undefined,
        page,
        limit,
      });
      
      // Transform to match expected format
      const transformedPosts = posts.map(p => ({
        id: p.id,
        authorId: p.authorId,
        categoryId: p.categoryId,
        title: p.title,
        description: p.description,
        images: p.images,
        location: p.location,
        urgency: p.urgency,
        fromLocation: p.fromLocation,
        toLocation: p.toLocation,
        vehicleType: p.vehicleType,
        seats: p.seats,
        status: p.status,
        isActive: p.isActive,
        viewCount: p.viewCount,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        author: {
          id: p.authorId,
          username: p.authorUsername,
          fullName: p.authorFullName,
          isVerified: p.authorIsVerified,
          badge: p.authorBadge,
        },
        category: {
          id: p.categoryId,
          name: p.categoryName,
          slug: p.categorySlug,
          icon: p.categoryIcon,
          color: p.categoryColor,
        },
        _count: {
          comments: 0,
          likes: 0,
          offers: 0,
        },
      }));
      
      return successResponse({
        posts: transformedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Use Prisma
    const prisma = await getPrisma();
    if (!prisma) {
      return successResponse({
        posts: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }

    try {
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { isActive: true };

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
        where.status = { in: ["open", "in_progress"] };
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
            { urgency: "desc" },
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
      console.log("Database error fetching posts:", dbError);
      return successResponse({
        posts: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }
  } catch (error) {
    console.error("Error fetching help posts:", error);
    return successResponse({
      posts: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
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

    const body: CreateHelpPostRequest = await request.json();
    const { categoryId, categoryName, title, description, images, location, urgency, fromLocation, toLocation, vehicleType, seats } = body;

    // Validate required fields
    if (!title || title.trim().length < 5) {
      return errorResponse("Titlul este obligatoriu (min 5 caractere)", 400);
    }
    if (!description || description.trim().length < 20) {
      return errorResponse("Descrierea este obligatorie (min 20 caractere)", 400);
    }

    // Use mock storage if no DATABASE_URL
    if (shouldUseMockStorage()) {
      // Determine category
      let finalCategoryId = categoryId;
      
      if (!finalCategoryId && categoryName) {
        // Create custom category
        const slug = categoryName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        
        const newCat = createMockCategory({
          name: categoryName.trim(),
          slug,
          icon: "📦",
          color: "#6B7280",
        });
        finalCategoryId = newCat.id;
      }
      
      if (!finalCategoryId) {
        return errorResponse("Categoria este obligatorie", 400);
      }
      
      // Verify category exists
      const catExists = getHardcodedCategoryById(finalCategoryId);
      if (!catExists && !finalCategoryId.startsWith("cat_")) {
        return errorResponse("Categoria nu există", 400);
      }
      
      try {
        const post = createMockPost({
          authorId: userId,
          authorUsername: authed.user.username || userId,
          authorFullName: authed.user.fullName || "Utilizator",
          authorIsVerified: authed.user.isVerified ?? false,
          authorBadge: authed.user.badge || "citizen",
          categoryId: finalCategoryId,
          title: title.trim(),
          description: description.trim(),
          images: images || [],
          location: location?.trim(),
          urgency: urgency || "normal",
          fromLocation: fromLocation?.trim(),
          toLocation: toLocation?.trim(),
          vehicleType: vehicleType?.trim(),
          seats: seats || undefined,
        });
        
        appendAuditLog({
          type: "help_post_created",
          actorUserId: userId,
          message: `Postare ajutor creată: ${title}`,
          metadata: { postId: post.id, categoryId: finalCategoryId, urgency },
        });
        
        // Transform to expected format
        const result = {
          id: post.id,
          authorId: post.authorId,
          categoryId: post.categoryId,
          title: post.title,
          description: post.description,
          images: post.images,
          location: post.location,
          urgency: post.urgency,
          fromLocation: post.fromLocation,
          toLocation: post.toLocation,
          vehicleType: post.vehicleType,
          seats: post.seats,
          status: post.status,
          isActive: post.isActive,
          viewCount: post.viewCount,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: {
            id: post.authorId,
            username: post.authorUsername,
            fullName: post.authorFullName,
            isVerified: post.authorIsVerified,
            badge: post.authorBadge,
          },
          category: {
            id: post.categoryId,
            name: post.categoryName,
            slug: post.categorySlug,
            icon: post.categoryIcon,
            color: post.categoryColor,
          },
        };
        
        return successResponse(result, "Postarea a fost creată", 201);
      } catch (mockError: unknown) {
        console.error("Error creating mock post:", mockError);
        const errMsg = mockError instanceof Error ? mockError.message : String(mockError);
        return errorResponse(`Eroare la crearea postării: ${errMsg}`, 500);
      }
    }

    // Use Prisma for database storage
    const prisma = await getPrisma();
    if (!prisma) {
      return errorResponse("Baza de date nu este disponibilă", 500);
    }

    // Ensure mock user exists in Prisma for foreign key relations
    await ensurePrismaUser(prisma, {
      id: userId,
      email: authed.user.email || `${userId}@mock.local`,
      username: authed.user.username || userId,
      fullName: authed.user.fullName || "Utilizator",
      isVerified: authed.user.isVerified,
      badge: authed.user.badge,
      role: authed.user.role,
    });

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

    // Get or create category - handle hardcoded categories
    let finalCategoryId: string | null = null;
    
    if (categoryId) {
      if (isHardcodedCategoryId(categoryId)) {
        const hardcodedCat = getHardcodedCategoryById(categoryId);
        if (!hardcodedCat) {
          return errorResponse("Categoria nu există", 400);
        }
        
        try {
          let dbCategory = await prisma.helpCategory.findFirst({
            where: { slug: hardcodedCat.slug },
          });
          
          if (!dbCategory) {
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
          return errorResponse("Eroare la crearea categoriei", 500);
        }
      } else {
        finalCategoryId = categoryId;
      }
    } else if (categoryName) {
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
        return errorResponse("Eroare la crearea categoriei", 500);
      }
    }

    if (!finalCategoryId) {
      return errorResponse("Categoria este obligatorie", 400);
    }

    // Verify category exists
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
    } catch (postError: unknown) {
      console.error("Error creating post in database:", postError);
      const errMsg = postError instanceof Error ? postError.message : String(postError);
      return errorResponse(`Eroare la crearea postării: ${errMsg.slice(0, 200)}`, 500);
    }
  } catch (error: unknown) {
    console.error("Error creating help post:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return errorResponse(`Eroare la crearea postării: ${errMsg.slice(0, 200)}`, 500);
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

    // Mock storage mode
    if (shouldUseMockStorage()) {
      const { getMockPostById, updateMockPost } = await import("@/lib/help/mock-storage");
      const post = getMockPostById(id);
      
      if (!post) {
        return errorResponse("Postarea nu există", 404);
      }
      
      if (post.authorId !== userId && !isAdmin) {
        return errorResponse("Nu ai permisiunea să editezi această postare", 403);
      }
      
      const updates: Record<string, unknown> = {};
      if (title && title.trim().length >= 5) updates.title = title.trim();
      if (description && description.trim().length >= 20) updates.description = description.trim();
      if (images !== undefined) updates.images = images;
      if (location !== undefined) updates.location = location?.trim() || null;
      if (urgency) updates.urgency = urgency;
      if (status && (post.authorId === userId || isAdmin)) updates.status = status;
      if (typeof isActive === "boolean" && isAdmin) updates.isActive = isActive;
      
      const updated = updateMockPost(id, updates);
      if (!updated) {
        return errorResponse("Eroare la actualizare", 500);
      }
      
      appendAuditLog({
        type: "help_post_updated",
        actorUserId: userId,
        message: `Postare actualizată: ${updated.title}`,
        metadata: { postId: id, changes: Object.keys(updates), isAdmin },
      });
      
      return successResponse(updated, "Postarea a fost actualizată");
    }

    // Prisma mode
    const prisma = await getPrisma();
    if (!prisma) {
      return errorResponse("Baza de date nu este disponibilă", 500);
    }

    const post = await prisma.helpPost.findUnique({ where: { id } });
    
    if (!post) {
      return errorResponse("Postarea nu există", 404);
    }

    if (post.authorId !== userId && !isAdmin) {
      return errorResponse("Nu ai permisiunea să editezi această postare", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (title && title.trim().length >= 5) updateData.title = title.trim();
    if (description && description.trim().length >= 20) updateData.description = description.trim();
    if (images !== undefined) updateData.images = images;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (urgency) updateData.urgency = urgency;
    if (fromLocation !== undefined) updateData.fromLocation = fromLocation?.trim() || null;
    if (toLocation !== undefined) updateData.toLocation = toLocation?.trim() || null;
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType?.trim() || null;
    if (seats !== undefined) updateData.seats = seats;
    if (status && (post.authorId === userId || isAdmin)) updateData.status = status;
    if (typeof isActive === "boolean" && isAdmin) updateData.isActive = isActive;

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

    // Mock storage mode
    if (shouldUseMockStorage()) {
      const { getMockPostById, deleteMockPost } = await import("@/lib/help/mock-storage");
      const post = getMockPostById(id);
      
      if (!post) {
        return errorResponse("Postarea nu există", 404);
      }
      
      if (post.authorId !== userId && !isAdmin) {
        return errorResponse("Nu ai permisiunea să ștergi această postare", 403);
      }
      
      deleteMockPost(id);
      
      appendAuditLog({
        type: "help_post_deleted",
        actorUserId: userId,
        message: `Postare ștearsă: ${post.title}`,
        metadata: { postId: id, isAdmin },
      });
      
      return successResponse({ deleted: true }, "Postarea a fost ștearsă");
    }

    // Prisma mode
    const prisma = await getPrisma();
    if (!prisma) {
      return errorResponse("Baza de date nu este disponibilă", 500);
    }

    const post = await prisma.helpPost.findUnique({ where: { id } });

    if (!post) {
      return errorResponse("Postarea nu există", 404);
    }

    if (post.authorId !== userId && !isAdmin) {
      return errorResponse("Nu ai permisiunea să ștergi această postare", 403);
    }

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
