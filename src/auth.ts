// /src/auth.ts
import NextAuth, { DefaultSession, getServerSession, type NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";
import { compare } from "bcryptjs";
import { z } from "zod";
import {
  ACCOUNT_LOCK_ATTEMPTS,
  ACCOUNT_LOCK_MINUTES,
  normalizeAppRole,
  recordAuthSecurityEvent,
  type AppRole,
} from "@/lib/auth-security";
import { checkRateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: AppRole;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role?: AppRole;
    email?: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    email?: string;
    name?: string | null;
    image?: string | null;
    sessionVersion?: number;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const DUMMY_PASSWORD_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5LmfLCk55ZovXxS6R7v1N4XKpQ6pQeW";
const isProduction = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  jwt: { maxAge: 8 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-lethela.session-token" : "lethela.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, request) {
        const headers = new Headers();
        Object.entries(request.headers || {}).forEach(([name, value]) => {
          if (typeof value === "string") headers.set(name, value);
          else if (Array.isArray(value)) headers.set(name, value.join(","));
        });
        const rateLimit = await checkRateLimit({
          key: "auth-login",
          limit: 10,
          windowMs: 15 * 60 * 1000,
          headers,
        });
        if (!rateLimit.ok) return null;

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          await compare(password, DUMMY_PASSWORD_HASH).catch(() => false);
          await recordAuthSecurityEvent({
            email,
            eventType: "LOGIN",
            outcome: "FAILED",
          });
          return null;
        }

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          await recordAuthSecurityEvent({
            userId: user.id,
            email,
            eventType: "ACCOUNT_LOCKED",
            outcome: "BLOCKED",
          });
          return null;
        }

        const ok = await compare(password, user.passwordHash);
        if (!ok) {
          const failedAttempts = user.failedLoginAttempts + 1;
          const shouldLock = failedAttempts >= ACCOUNT_LOCK_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: failedAttempts,
              lockedUntil: shouldLock
                ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000)
                : null,
            },
          });
          await recordAuthSecurityEvent({
            userId: user.id,
            email,
            eventType: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN",
            outcome: "FAILED",
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });
        await recordAuthSecurityEvent({
          userId: user.id,
          email,
          eventType: "LOGIN",
          outcome: "SUCCESS",
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
          role: normalizeAppRole(user.role),
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeAppRole(user.role);
        token.email = user.email ?? token.email ?? "";
        token.name = user.name ?? null;
        token.image = user.image ?? null;
        token.sessionVersion = "sessionVersion" in user ? Number(user.sessionVersion || 0) : 0;
      } else if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, sessionVersion: true },
        });
        if (!current || current.sessionVersion !== Number(token.sessionVersion || 0)) {
          token.id = "";
          token.email = "";
          token.role = "CUSTOMER";
          return token;
        }
        token.role = normalizeAppRole(current.role);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "CUSTOMER";
        session.user.email = token.email ?? session.user.email ?? "";
        session.user.name = token.name ?? session.user.name ?? null;
        session.user.image = token.image ?? session.user.image ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  events: {
    async signOut({ token }) {
      if (token?.email) {
        await recordAuthSecurityEvent({
          userId: token.id || null,
          email: token.email,
          eventType: "LOGOUT",
          outcome: "SUCCESS",
        });
      }
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

export const nextAuthHandler = NextAuth(authOptions);
