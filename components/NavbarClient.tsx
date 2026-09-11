'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { triggerHaptic } from '@/lib/haptics';
import UnifiedNavbarSearch from './UnifiedNavbarSearch';

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
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Back Button & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isHomePage && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                router.back();
              }}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <Link
            href="/"
            onClick={() => triggerHaptic('light')}
            className="font-extrabold text-white text-base sm:text-lg tracking-tight hover:text-purple-400 transition"
          >
            playLog
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-2">
          <UnifiedNavbarSearch />
        </div>

        {/* Right: Auth Profile */}
        <div className="flex items-center justify-end text-xs font-semibold shrink-0">
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
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white uppercase text-[11px] font-bold">
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

