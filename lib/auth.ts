// lib/auth.ts
import NextAuth from "next-auth";
import TwitchProvider from "next-auth/providers/twitch";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      // Map Twitch profile data to your custom Prisma User.username column
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.preferred_username || profile.login,
          email: profile.email,
          image: profile.picture,
          username: profile.preferred_username || profile.login, // 👈 Saves to DB
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user || !user.hashedPassword) return null;

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
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 1. Initial sign-in: Attach username to JWT token
      if (user) {
        token.id = user.id;
        token.username = (user as any).username || user.name || '';
      }

      // 2. DB Fallback: If token lacks username, fetch directly from Prisma
      if (!token.username && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { username: true },
        });
        if (dbUser?.username) {
          token.username = dbUser.username;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.username = (token.username as string) || '';
        session.user.email = token.email || '';
        session.user.image = (token.picture as string) || '';
      }
      return session;
    },
  },
});