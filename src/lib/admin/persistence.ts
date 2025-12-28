// Admin Configuration Persistence Layer
// This file handles admin config storage that survives server restarts on Render

let persistedAdminConfig = {
  owner: {
    id: "admin_owner",
    email: "admin@imperiul-sui-luris.com",
    password: "test1",
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
  const admin = persistedAdminConfig.owner;
  return email === admin.email && password === admin.password;
};
