// Database configuration
// In production, use PostgreSQL with Prisma or TypeORM
// For development, we'll use a mock database structure

export const DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/imperiu_sui_luris";

// Mock database for development
export const mockDatabase = {
  users: [
    {
      id: "user_001",
      email: "citizen@imperiu-sui-luris.com",
      username: "citizen_test",
      fullName: "Test Citizen",
      country: "Romania",
      citizenship: "active",
      totalLandArea: 2500,
      totalFunds: 5000,
      documentCount: 3,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date(),
    },
    {
      id: "user_admin",
      email: "admin@imperiu-sui-luris.com",
      username: "admin_sui",
      fullName: "State Administrator",
      country: "Imperiu Sui Luris",
      citizenship: "active",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date(),
    },
  ],
  documents: [
    {
      id: "doc_001",
      userId: "user_001",
      type: "bulletin",
      documentNumber: "ISL-2024-001-A",
      issueDate: new Date("2024-01-15"),
      price: 10,
      status: "active",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date(),
    },
    {
      id: "doc_002",
      userId: "user_001",
      type: "passport",
      documentNumber: "ISL-2024-001-B",
      issueDate: new Date("2024-02-01"),
      expiryDate: new Date("2034-02-01"),
      price: 50,
      status: "active",
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date(),
    },
  ],
  landProperties: [
    {
      id: "land_001",
      userId: "user_001",
      name: "Green Valley Farm",
      location: "North Sector, Imperiu Sui Luris",
      coordinates: {
        latitude: 45.9432,
        longitude: 24.9668,
      },
      areaSize: 2500,
      type: "agricultural",
      resources: ["river access", "fertile soil"],
      purchaseDate: new Date("2024-03-01"),
      purchasePrice: 500,
      description: "Beautiful agricultural land with river access for sustainable farming",
      images: [],
      status: "active",
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date(),
    },
  ],
  transactions: [] as any[],
  feedPosts: [
    {
      id: "feed_001",
      authorId: "user_admin",
      content: "Welcome to Imperiu Sui Luris! We're building a new nation focused on liberty, brotherhood, and sustainability. Join our mission to protect water, ensure food security, and develop clean energy!",
      images: [],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date(),
      likes: 42,
      comments: [],
    },
  ],
};
