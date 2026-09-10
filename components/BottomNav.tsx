// components/BottomNav.tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import BottomNavClient from './BottomNavClient';

export default async function BottomNav() {
  const session = await auth();

  let username: string | undefined = undefined;
  let avatarUrl: string | undefined = undefined;

  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { username: true, image: true },
    });
    username = dbUser?.username ?? undefined;
    avatarUrl = dbUser?.image || session.user?.image || undefined;
  }

  return (
    <BottomNavClient
      isAuthenticated={!!session}
      username={username}
      avatarUrl={avatarUrl}
      fallbackInitial={session?.user?.name?.[0] || 'U'}
    />
  );
}

