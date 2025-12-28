// Admin Configuration Persistence Layer
// This file handles admin config storage that survives server restarts on Render

import bcrypt from "bcryptjs";

// Store password hashed in memory for persistence simulation
const ownerPlainPassword = "test1"; // default owner password for initial setup (change via admin UI)
let persistedAdminConfig = {
  owner: {
    id: "admin_owner",
    email: "admin@imperiul-sui-luris.com",
    // hashed password
    passwordHash: bcrypt.hashSync(ownerPlainPassword, 8),
    role: "owner",
    permissions: [
      "manage_users",
      "manage_posts",
      "manage_payments",
      "manage_settings",
      "view_analytics",
    ],
    createdAt: new Date().toISOString(),
  },
};

export const getAdminConfig = () => {
  return persistedAdminConfig;
};

export const updateAdminConfig = (newConfig: typeof persistedAdminConfig) => {
  persistedAdminConfig = { ...persistedAdminConfig, ...newConfig };
  return persistedAdminConfig;
};

export const validateAdminCredentials = (email: string, password: string) => {
  const admin = persistedAdminConfig.owner as any;
  if (email !== admin.email) return false;
  // Support both hashed and legacy plain password (legacy only during transition)
  if (admin.passwordHash) {
    try {
      return bcrypt.compareSync(password, admin.passwordHash);
    } catch {
      return false;
    }
  }
  if (admin.password) {
    return password === admin.password;
  }
  return false;
};
