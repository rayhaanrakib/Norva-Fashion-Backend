import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  // Prisma client and native modules must stay external at runtime.
  external: ["@prisma/client", "prisma", "bcryptjs", "ioredis", "stripe"],
});
