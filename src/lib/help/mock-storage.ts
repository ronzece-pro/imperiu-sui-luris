// Mock Storage for Help System - used when DATABASE_URL is not available
// This provides in-memory + file-based fallback for demo/development

import fs from "fs";
import path from "path";
import { HARDCODED_CATEGORIES, HardcodedCategory } from "./categories";

const DATA_DIR = path.join(process.cwd(), "data");
const POSTS_FILE = path.join(DATA_DIR, "help-posts.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "help-categories.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // In serverless, we may not have write access
  }
}

export interface MockHelpPost {
  id: string;
  authorId: string;
  authorUsername: string;
  authorFullName: string;
  authorIsVerified: boolean;
  authorBadge: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  categoryColor: string;
  title: string;
  description: string;
  images: string[];
  location: string | null;
  urgency: string;
  fromLocation: string | null;
  toLocation: string | null;
  vehicleType: string | null;
  seats: number | null;
  status: string;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage (fallback when file system is not available)
let inMemoryPosts: MockHelpPost[] = [];
let inMemoryCategories: HardcodedCategory[] = [...HARDCODED_CATEGORIES];

function loadPosts(): MockHelpPost[] {
  ensureDataDir();
  try {
    if (fs.existsSync(POSTS_FILE)) {
      const data = fs.readFileSync(POSTS_FILE, "utf-8");
      inMemoryPosts = JSON.parse(data);
      return inMemoryPosts;
    }
  } catch (error) {
    console.log("Could not load posts from file, using in-memory:", error);
  }
  return inMemoryPosts;
}

function savePosts(posts: MockHelpPost[]): void {
  inMemoryPosts = posts;
  ensureDataDir();
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
  } catch (error) {
    console.log("Could not save posts to file, keeping in memory only:", error);
  }
}

function loadCategories(): HardcodedCategory[] {
  ensureDataDir();
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      const data = fs.readFileSync(CATEGORIES_FILE, "utf-8");
      inMemoryCategories = JSON.parse(data);
      return inMemoryCategories;
    }
  } catch {
    // Use hardcoded
  }
  return inMemoryCategories;
}

function saveCategories(categories: HardcodedCategory[]): void {
  inMemoryCategories = categories;
  ensureDataDir();
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), "utf-8");
  } catch {
    // Keep in memory only
  }
}

// Generate unique ID
function generateId(): string {
  return `post_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Public API

export function getMockPosts(filters?: {
  categorySlug?: string;
  status?: string;
  authorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): { posts: MockHelpPost[]; total: number } {
  let posts = loadPosts().filter(p => p.isActive);
  
  if (filters?.categorySlug) {
    posts = posts.filter(p => p.categorySlug === filters.categorySlug);
  }
  
  if (filters?.status) {
    if (filters.status.includes(",")) {
      const statuses = filters.status.split(",");
      posts = posts.filter(p => statuses.includes(p.status));
    } else {
      posts = posts.filter(p => p.status === filters.status);
    }
  } else {
    // Default: open or in_progress
    posts = posts.filter(p => p.status === "open" || p.status === "in_progress");
  }
  
  if (filters?.authorId) {
    posts = posts.filter(p => p.authorId === filters.authorId);
  }
  
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    posts = posts.filter(p => 
      p.title.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by urgency (urgent first) then by date
  posts.sort((a, b) => {
    if (a.urgency === "urgent" && b.urgency !== "urgent") return -1;
    if (b.urgency === "urgent" && a.urgency !== "urgent") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  const total = posts.length;
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;
  
  posts = posts.slice(skip, skip + limit);
  
  return { posts, total };
}

export function getMockPostById(id: string): MockHelpPost | null {
  const posts = loadPosts();
  return posts.find(p => p.id === id) || null;
}

export function createMockPost(data: {
  authorId: string;
  authorUsername: string;
  authorFullName: string;
  authorIsVerified: boolean;
  authorBadge: string;
  categoryId: string;
  title: string;
  description: string;
  images?: string[];
  location?: string;
  urgency?: string;
  fromLocation?: string;
  toLocation?: string;
  vehicleType?: string;
  seats?: number;
}): MockHelpPost {
  const categories = loadCategories();
  const category = categories.find(c => c.id === data.categoryId);
  
  if (!category) {
    throw new Error("Category not found");
  }
  
  const now = new Date().toISOString();
  const post: MockHelpPost = {
    id: generateId(),
    authorId: data.authorId,
    authorUsername: data.authorUsername,
    authorFullName: data.authorFullName,
    authorIsVerified: data.authorIsVerified,
    authorBadge: data.authorBadge,
    categoryId: category.id,
    categoryName: category.name,
    categorySlug: category.slug,
    categoryIcon: category.icon,
    categoryColor: category.color,
    title: data.title,
    description: data.description,
    images: data.images || [],
    location: data.location || null,
    urgency: data.urgency || "normal",
    fromLocation: data.fromLocation || null,
    toLocation: data.toLocation || null,
    vehicleType: data.vehicleType || null,
    seats: data.seats || null,
    status: "open",
    isActive: true,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  
  const posts = loadPosts();
  posts.unshift(post); // Add to beginning
  savePosts(posts);
  
  return post;
}

export function updateMockPost(id: string, updates: Partial<MockHelpPost>): MockHelpPost | null {
  const posts = loadPosts();
  const index = posts.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  posts[index] = {
    ...posts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  savePosts(posts);
  return posts[index];
}

export function deleteMockPost(id: string): boolean {
  const posts = loadPosts();
  const index = posts.findIndex(p => p.id === id);
  
  if (index === -1) return false;
  
  posts[index].isActive = false;
  savePosts(posts);
  return true;
}

export function getMockCategories(): HardcodedCategory[] {
  return loadCategories();
}

export function createMockCategory(data: {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
}): HardcodedCategory {
  const categories = loadCategories();
  
  // Check if already exists
  const existing = categories.find(c => c.slug === data.slug);
  if (existing) return existing;
  
  const now = new Date();
  const newCat: HardcodedCategory = {
    id: `cat_${data.slug}`,
    name: data.name,
    slug: data.slug,
    icon: data.icon || "📦",
    color: data.color || "#6B7280",
    description: data.description || "",
    sortOrder: categories.length,
    isActive: true,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    _count: { posts: 0 },
  };
  
  categories.push(newCat);
  saveCategories(categories);
  
  return newCat;
}

// Check if we should use mock storage
export function shouldUseMockStorage(): boolean {
  return !process.env.DATABASE_URL;
}
