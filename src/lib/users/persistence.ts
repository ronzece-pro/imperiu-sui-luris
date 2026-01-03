import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export interface PersistedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  country: string;
  citizenship: string;
  role: string;
  badge: string;
  accountStatus: string;
  isVerified: boolean;
  verifiedUntil?: string;
  passwordHash: string;
  invitedByUserId?: string;
  invitedByCode?: string;
  totalLandArea: number;
  totalFunds: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

// Default admin user
const defaultUsers: PersistedUser[] = [
  {
    id: "user_admin",
    email: "admin@imperiu-sui-luris.com",
    username: "admin",
    fullName: "Administrator",
    country: "Romania",
    citizenship: "active",
    role: "admin",
    badge: "owner",
    accountStatus: "active",
    isVerified: true,
    passwordHash: bcrypt.hashSync("admin123", 8),
    totalLandArea: 0,
    totalFunds: 0,
    documentCount: 0,
    createdAt: new Date("2025-01-01").toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadUsers(): PersistedUser[] {
  ensureDataDir();
  
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      const users = JSON.parse(data) as PersistedUser[];
      
      // Ensure admin exists
      const hasAdmin = users.some(u => u.id === "user_admin");
      if (!hasAdmin) {
        users.push(defaultUsers[0]);
        saveUsers(users);
      }
      
      return users;
    }
  } catch (error) {
    console.error("Error reading users file:", error);
  }
  
  // Initialize with defaults
  saveUsers(defaultUsers);
  return [...defaultUsers];
}

export function saveUsers(users: PersistedUser[]): void {
  ensureDataDir();
  
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error saving users file:", error);
  }
}

export function findUserByEmail(email: string): PersistedUser | undefined {
  const users = loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): PersistedUser | undefined {
  const users = loadUsers();
  return users.find(u => u.id === id);
}

export function createUser(userData: Omit<PersistedUser, "createdAt" | "updatedAt">): PersistedUser {
  const users = loadUsers();
  
  const newUser: PersistedUser = {
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  users.push(newUser);
  saveUsers(users);
  
  return newUser;
}

export function updateUser(id: string, updates: Partial<PersistedUser>): PersistedUser | null {
  const users = loadUsers();
  const index = users.findIndex(u => u.id === id);
  
  if (index === -1) return null;
  
  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveUsers(users);
  return users[index];
}

export function getAllUsers(): PersistedUser[] {
  return loadUsers();
}

export function deleteUser(id: string): boolean {
  const users = loadUsers();
  const index = users.findIndex(u => u.id === id);
  
  if (index === -1) return false;
  
  // Don't actually delete admin
  if (id === "user_admin") return false;
  
  // Mark as deleted instead of removing
  users[index].accountStatus = "deleted";
  users[index].updatedAt = new Date().toISOString();
  saveUsers(users);
  
  return true;
}
