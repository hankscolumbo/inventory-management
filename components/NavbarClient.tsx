// components/NavbarClient.tsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { triggerHaptic } from '@/lib/haptics';
import GameSearch from './GameSearch';
import CommunitySearchBar from './CommunitySearchBar';

interface NavbarClientProps {
  isAuthenticated: boolean;
  username?: string;
  avatarUrl?: string;
  fallbackName?: string;
}

export default function NavbarClient({
  isAuthenticated,
  username,
  avatarUrl,
  fallbackName,
}: NavbarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/dashboard';

  const profileHref = username ? `/u/${username}` : '/profile';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Back Button & Brand Title */}
        <div className="flex items-center gap-3">
          {!isHomePage && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                router.back();
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Back</span>
            </button>
          )}

          <Link
            href="/"
            onClick={() => triggerHaptic('light')}
            className="font-extrabold text-white text-base sm:text-lg tracking-tight hover:text-purple-400 transition truncate"
          >
            playLog
          </Link>
        </div>

        {/* Game Search */}
        <div className="flex-1 max-w-xs sm:max-w-sm relative [&_input]:h-8 [&_input]:py-1 [&_input]:text-xs [&_svg]:top-1/2 [&_svg]:-translate-y-1/2">
          <GameSearch />
        </div>

        {/* Community Search Bar */}
        <div className="hidden md:block flex-1 max-w-xs sm:max-w-sm relative [&_input]:h-8 [&_input]:py-1 [&_input]:text-xs [&_svg]:top-1/2 [&_svg]:-translate-y-1/2">
          <CommunitySearchBar />
        </div>

        {/* Profile / Auth State */}
        <div className="flex items-center justify-end text-xs font-semibold">
          {isAuthenticated ? (
            <Link
              href={profileHref}
              onClick={() => triggerHaptic('light')}
              className="flex items-center gap-2 text-slate-200 hover:text-purple-400 transition"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full border border-purple-500/50 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white uppercase">
                  {username ? username[0] : (fallbackName || 'U')[0]}
                </div>
              )}
              <span className="hidden sm:inline">
                {username || fallbackName || 'Profile'}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => triggerHaptic('light')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition whitespace-nowrap"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
