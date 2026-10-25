import { runSeed } from "../src/app/utils/seed";
import { prisma } from "../src/app/lib/prisma";

console.log("Seeding the NORVA database…");

runSeed()
  .then((result) => {
    console.log("✅ Seed complete:", result);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
