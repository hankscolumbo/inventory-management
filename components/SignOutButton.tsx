'use client'

import { signOut } from 'next-auth/react';

export default function SignOutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-3.5 py-1.5 bg-rose-600/10 hover:bg-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
            >
                <span>🚪</span> Sign Out
            </button>
    );
}