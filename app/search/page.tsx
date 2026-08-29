// app/search/page.tsx
import { Suspense } from 'react';
import GameSearch from '@/components/GameSearch';
import SearchResultsGrid from '@/components/SearchResultsGrid';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-950 text-white py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Search Games</h1>
          <p className="text-sm text-slate-400">
            Find games to add to your custom lists or log your playtime and status.
          </p>
        </div>

        <Suspense fallback={<div className="w-full max-w-xl mx-auto h-12 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />}>
          <GameSearch initialQuery={q || ''} />
        </Suspense>

        <Suspense fallback={<div className="max-w-6xl mx-auto h-64 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse" />}>
          <SearchResultsGrid />
        </Suspense>
      </div>
    </main>
  );
}
