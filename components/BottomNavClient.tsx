// components/BottomNavClient.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { triggerHaptic } from '@/lib/haptics';

interface BottomNavClientProps {
  isAuthenticated: boolean;
  username?: string;
  avatarUrl?: string;
  fallbackInitial?: string;
}

export default function BottomNavClient({
  isAuthenticated,
  username,
  avatarUrl,
  fallbackInitial = 'U',
}: BottomNavClientProps) {
  const pathname = usePathname();

  const profileHref = isAuthenticated
    ? (username ? `/u/${username}` : '/profile')
    : '/login';

  const NAV_ITEMS = [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'Browse', href: '/browse', icon: '🌍' },
    { label: 'Search', href: '/search', icon: '🔍' },
    { label: 'Profile', href: profileHref, icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[9999] w-full bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/login' && pathname.startsWith(item.href));

          const isProfileTab = item.label === 'Profile';

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => triggerHaptic('light')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition ${
                isActive
                  ? 'text-purple-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              {isProfileTab && isAuthenticated ? (
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className={`w-5 h-5 rounded-full object-cover border ${
                      isActive ? 'border-purple-400' : 'border-slate-700'
                    }`}
                  />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] uppercase font-bold text-white bg-purple-600 border ${
                      isActive ? 'border-purple-300' : 'border-transparent'
                    }`}
                  >
                    {username ? username[0] : fallbackInitial}
                  </div>
                )
              ) : (
                <span className="text-base leading-none">{item.icon}</span>
              )}
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

