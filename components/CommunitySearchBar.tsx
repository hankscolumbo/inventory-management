// components/CommunitySearchBar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchCommunity } from '@/app/actions/searchCommunity';

export default function CommunitySearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ users: any[]; lists: any[] }>({ users: [], lists: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        const res = await searchCommunity(query);
        setResults(res);
        setLoading(false);
        setIsOpen(true);
      } else {
        setResults({ users: [], lists: [] });
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full max-w-xs">
      <input
        type="text"
        placeholder="Search users & lists..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setIsOpen(true)}
        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
      />

      {isOpen && (results.users.length > 0 || results.lists.length > 0) && (
        <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-800">
          
          {/* Users Section */}
          {results.users.length > 0 && (
            <div className="p-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 px-2 tracking-wider">Users</span>
              {results.users.map((user) => (
                <Link
                  key={user.id}
                  href={`/u/${user.username || user.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-2 py-2 hover:bg-slate-800 rounded-lg transition"
                >
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                    {user.username?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-medium text-white">@{user.username || user.name}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Public Lists Section */}
          {results.lists.length > 0 && (
            <div className="p-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 px-2 tracking-wider">Public Lists</span>
              {results.lists.map((list) => (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  onClick={() => setIsOpen(false)}
                  className="block px-2 py-2 hover:bg-slate-800 rounded-lg transition"
                >
                  <div className="text-sm font-semibold text-white">{list.title}</div>
                  <div className="text-xs text-slate-400">by @{list.user.username || list.user.name}</div>
                </Link>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}