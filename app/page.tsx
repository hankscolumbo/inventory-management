import GameSearch from '@/components/GameSearch';
import GameSearchAutoSuggest from '@/components/GameSearchAutoSuggest';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12">
      <header className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          🎮 Inventory Management
        </h1>
        <p className="text-slate-400 max-w-md mx-auto">
          Track games you've played, log your ratings, and build custom lists.
        </p>
      </header>

      <GameSearch />
    </main>
  );
}