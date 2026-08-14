import Link from 'next/link';
import { auth, signIn, signOut } from '@/lib/auth';

export async function Navbar() {
    const session = await auth();

    return (
        <nav className="w-full bg-slate-900 border-b border-slate-800 py-4 px-6 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-white flex items-center gap-2">
            🎮 Inventory Management
            </Link>

            <div className="flex items-center gap-4">
                {session?.user ? (
                    <div className="flex items-center gap-3">
                        {session.user.image && (
                            <img
                                src={session.user.image}
                                alt={session.user.name || 'User avatar'}
                                className="w-8 h-8 rounded-full border border-slate-700"
                                />
                        )}
                        <span className="text-sm text-slate-300 font-medium">
                            {session.user.name || session.user.email}
                        </span>

                        <form
                            action={async () => {
                                'use server';
                                await signOut({ redirectTo: '/' });
                            }}
                            >
                                <button
                                    type="submit"
                                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition"
                                    >
                                    Sign Out
                                </button>
                            </form>
                        </div>
                ) : (
                    <form
                            action={async () => {
                                'use server';
                                await signIn('twitch', { redirectTo: '/' });
                            }}
                            >
                                <button
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition"
                                    >
                                    Sign In with Twitch
                                </button>
                            </form>
                        )}
                    </div>
        </nav>
    );
}