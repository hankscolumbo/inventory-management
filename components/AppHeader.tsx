'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isHomePage && (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <span>←</span>
              <span>Back</span>
            </button>
          )}
        </div>
        <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">
          Game Log
        </span>
        <div className="w-12" />
      </div>
    </header>
  );
}
