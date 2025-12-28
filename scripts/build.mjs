import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const hasDb = !!process.env.DATABASE_URL;

if (hasDb) {
  run("npx", ["prisma", "generate"]);
  run("npx", ["prisma", "migrate", "deploy"]);
}

run("npx", ["next", "build"]);
