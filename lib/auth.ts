// lib/auth.ts
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import TwitchProvider from 'next-auth/providers/twitch';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'user:read:email openid',
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.preferred_username || profile.login,
          username: (profile.preferred_username || profile.login || '').toLowerCase(),
          email: profile.email,
          image: profile.picture || profile.profile_image_url,
        };
      },
    }),
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