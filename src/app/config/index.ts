import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const list = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default {
  server: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isProduction: process.env.NODE_ENV === "production",
    port: num(process.env.PORT, 5000),
    backendUrl: process.env.BACKEND_URL ?? "http://localhost:5000",
    /** First entry is treated as the canonical storefront origin. */
    frontendUrls: list(process.env.FRONTEND_URL).length
      ? list(process.env.FRONTEND_URL)
      : ["http://localhost:3000"],
    databaseUrl: process.env.DATABASE_URL ?? "",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret_change_me",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  },
  bcryptSaltRounds: num(process.env.BCRYPT_SALT_ROUNDS, 10),
  adminEmails: list(process.env.ADMIN_EMAILS),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: `${process.env.BACKEND_URL ?? "http://localhost:5000"}/api/v1/auth/google/callback`,
  },
  redis: {
    url: process.env.REDIS_URL ?? "",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: num(process.env.SMTP_PORT, 465),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASSWORD ?? "",
    sender: process.env.EMAIL_SENDER ?? "NORVA <hello@norva.store>",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    currency: (process.env.STRIPE_CURRENCY ?? "usd").toLowerCase(),
  },
  commerce: {
    currency: process.env.CURRENCY ?? "USD",
    freeShippingThreshold: num(process.env.FREE_SHIPPING_THRESHOLD, 100),
    shippingFee: num(process.env.STANDARD_SHIPPING_FEE, 9),
    taxRate: num(process.env.TAX_RATE, 0.05),
    loyaltyCashbackPercent: num(process.env.LOYALTY_CASHBACK_PERCENT, 2),
  },
  seed: {
    admin: {
      name: process.env.SEED_ADMIN_NAME ?? "Norva Admin",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@norva.store",
      password: process.env.SEED_ADMIN_PASSWORD ?? "NorvaAdmin123!",
    },
    staff: {
      name: process.env.SEED_STAFF_NAME ?? "Norva Studio",
      email: process.env.SEED_STAFF_EMAIL ?? "studio@norva.store",
      password: process.env.SEED_STAFF_PASSWORD ?? "NorvaStudio123!",
    },
    customer: {
      name: process.env.SEED_CUSTOMER_NAME ?? "Amina Rahman",
      email: process.env.SEED_CUSTOMER_EMAIL ?? "customer@norva.store",
      password: process.env.SEED_CUSTOMER_PASSWORD ?? "NorvaCustomer123!",
    },
  },
} as const;
