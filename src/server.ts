import app from "./app";
import config from "./app/config";
import { initializeServices } from "./app/lib/initServices";
import { prisma } from "./app/lib/prisma";

const isServerless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

if (!isServerless) {
  (async () => {
    try {
      await initializeServices();
      app.listen(config.server.port, "0.0.0.0", () => {
        console.log(`
  ✦ NORVA API
  ────────────────────────────────────────
  Style Without Limits
  listening   http://localhost:${config.server.port}
  env         ${config.server.nodeEnv}
  storefront  ${config.server.frontendUrls[0]}
  ────────────────────────────────────────
`);
      });
    } catch (error) {
      console.error("Failed to start the server:", error);
      await prisma.$disconnect();
      process.exit(1);
    }
  })();
}

export default app;
