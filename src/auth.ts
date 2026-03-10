// /src/auth.ts
import NextAuth, { DefaultSession, getServerSession, type NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";
import { compare } from "bcryptjs";
import { z } from "zod";

type AppRole = "USER" | "VENDOR" | "RIDER" | "ADMIN";

function isAppRole(value: unknown): value is AppRole {
  return value === "USER" || value === "VENDOR" || value === "RIDER" || value === "ADMIN";
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: AppRole;
      email: string;
      name?: string | null;
    };
  }

  interface User {
    id: string;
    role?: AppRole;
    email?: string;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    email?: string;
    name?: string | null;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !isAppRole(user.role)) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = isAppRole(user.role) ? user.role : "USER";
        token.email = user.email ?? token.email ?? "";
        token.name = user.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "USER";
        session.user.email = token.email ?? session.user.email ?? "";
        session.user.name = token.name ?? session.user.name ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

export const nextAuthHandler = NextAuth(authOptions);
