// components/Navbar.tsx
import { auth, signIn, signOut } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';

export default async function Navbar() {
  let session = null;

  try {
    session = await auth();
  } catch (error) {
    console.error('Navbar Session Fetch Error:', error);
  }

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="font-extrabold text-white text-lg tracking-tight hover:text-purple-400 transition"
        >
          GameTrack
        </Link>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="text-sm font-medium text-slate-300 hover:text-white transition"
              >
                {session.user.name || session.user.email || 'Profile'}
              </Link>
              <form
                action={async () => {
                  'use server';
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-2 rounded-lg border border-slate-700 transition"
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <form
              action={async () => {
                'use server';
                await signIn('twitch');
              }}
            >
              <button
                type="submit"
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg transition shadow-md shadow-purple-900/20"
              >
                Sign In with Twitch
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}