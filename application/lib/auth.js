import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { prisma } from "./prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
const configuredAppUrl = process.env.BETTER_AUTH_URL || "";
const publicAppUrl = configuredAppUrl || "http://localhost:3000";
const configuredSecret = process.env.BETTER_AUTH_SECRET || "";

export const studentAuthConfigured = Boolean(
  configuredSecret.length >= 32 && configuredAppUrl && googleClientId && googleClientSecret
);

// The fallback only lets the public site boot during local setup. The auth API
// refuses sign-in until the real environment variables are configured.
const authSecret = configuredSecret || "local-setup-only-secret-change-before-production";

export const auth = betterAuth({
  appName: "Admission Compass",
  baseURL: publicAppUrl,
  secret: authSecret,
  trustedOrigins: [publicAppUrl],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: {
    database: { generateId: "serial" }
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
        input: false
      }
    }
  },
  account: {
    encryptOAuthTokens: true
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/social": { window: 60, max: 10 }
    }
  },
  socialProviders: studentAuthConfigured
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret
        }
      }
    : {}
});
