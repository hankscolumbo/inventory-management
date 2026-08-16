//import { handlers } from '@/lib/auth';
import NextAuth from 'next-auth';
import TwitchProvider from 'next-auth/providers/twitch';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const {handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET,
    adapter: PrismaAdapter(prisma),
    providers: [
        TwitchProvider({
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.preferred_username || profile.login,
                    username: (profile.preferred_username || profile.login || '').toLowerCase(),
                    email: profile.email,
                    image: profile.profile_image_url,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, profile }) {
            if (user && profile ) {
                const twitchUsername = (
                    (profile as any).preferred_username ||
                    (profile as any).login ||
                    ''
                ).toLowerCase();

                if (twitchUsername) {
                    // sync username into Neon DB
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { username: twitchUsername },
                    });
                }
            }
            return true;
        },
    },
});

export const { GET, POST } = handlers;