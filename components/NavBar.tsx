// components/Navbar.tsx
import { auth, signIn, signOut } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function Navbar() {
  const session = await auth();

  let username = null;

  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { username: true },
    });
    username = dbUser?.username;
  }

  // Fallback profile link if username isn't set yet
  const profileHref = username ? `/u/${username}` : '/profile';

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-extrabold text-white text-lg tracking-tight hover:text-purple-400 transition"
        >
          Inventory Management
        </Link>

        <div className="flex items-center gap-4 text-xs font-semibold">
          {session ? (
            /* Logged In State: Direct to /u/[username] */
              <Link
                href={profileHref}
                className="flex items-center gap-2 text-slate-200 hover:text-purple transition"
              >
                {session.user?.image && (
                    <img
                        src={session.user.image}
                        alt="Avatar"
                        className="w-6 h-6 rounded-full border-purple-500/50"
                    />
                )}
            <span>{username ? `${username}` : (session.user?.name || 'Profile')}</span>
            </Link>
          ) : (
            /* Logged Out State: Show Sign In Link */
            <Link
                href="/api/auth/signin"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
                >
                    Sign In With Twitch
                </Link>
          )}
        </div>
      </nav>
    </header>
  );
}