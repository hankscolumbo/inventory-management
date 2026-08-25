// lib/auth.ts (or auth.ts)
import NextAuth from "next-auth";
import TwitchProvider from "next-auth/providers/twitch";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // ✅ REQUIRED for Credentials provider
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Find user by username
        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string }
        });

        // If no user or user signed up with Twitch (no password)
        if (!user || !user.hashedPassword) {
          return null;
        }

        // Verify Password
        const passwordsMatch = await bcrypt.compare(
          credentials.password as string, 
          user.hashedPassword
        );

        if (passwordsMatch) {
          return {
            id: user.id,
            name: user.name ?? undefined,
            email: user.email ?? undefined,
            image: user.image ?? undefined,
            username: user.username ?? undefined,
          }; // Successfully authenticated
        }

        return null;
      }
    })
  ],
  callbacks: {
    async signIn() {
        return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = (user as any).username || (user as any).name?.toLowerCase();
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.email) session.user.email = token.email as string;
        if (token.username) session.user.username = token.username as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
});