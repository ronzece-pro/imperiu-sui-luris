import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

// Always generate Prisma client (needed for TypeScript compilation)
run("npx", ["prisma", "generate"]);

// Only run migrations if DATABASE_URL is set
const hasDb = !!process.env.DATABASE_URL;
if (hasDb) {
  run("npx", ["prisma", "migrate", "deploy"]);
}

run("npx", ["next", "build"]);
