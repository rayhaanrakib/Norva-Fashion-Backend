import { runSeed } from "../utils/seed";
import { cache } from "./cache";
import { prisma } from "./prisma";

let initialization: Promise<void> | null = null;

/**
 * Connects the datastores once per process and seeds demo content.
 * Failures reset the promise so the next request retries instead of
 * permanently poisoning the instance.
 */
export const initializeServices = async (): Promise<void> => {
  if (initialization) return initialization;

  initialization = (async () => {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected");

    const cacheUp = await cache.ping();
    console.log(cacheUp ? "✅ Cache ready" : "⚠️  Cache unavailable — using memory");

    // Demo data is seeded automatically so a fresh instance is never an empty
    // shell: the storefront's `/demo` buttons sign in with these accounts, and
    // every dashboard needs rows to render. Opt out with SEED_ON_BOOT=false
    // (or point DATABASE_URL at a database you do not want touched).
    if (process.env.SEED_ON_BOOT !== "false") {
      const result = await runSeed({ silent: true });
      console.log(
        `✅ Demo data ready — ${result.categories} categories, ${result.products} new products` +
          " · demo logins: customer@norva.store / admin@norva.store",
      );
    } else {
      console.log("ℹ️  SEED_ON_BOOT=false — skipping demo data");
    }
  })().catch((error) => {
    initialization = null;
    throw error;
  });

  return initialization;
};
