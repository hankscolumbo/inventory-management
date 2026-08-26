// components/Navbar.tsx
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import GameSearch from './GameSearch';
import CommunitySearchBar from './CommunitySearchBar';

export default async function Navbar() {
    const session = await auth();

    let username: string | undefined = undefined;
    let avatarUrl: string | undefined = undefined;

    if (session?.user?.email) {
        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { username: true, image: true },
        });
        username = dbUser?.username ?? undefined;
        avatarUrl = dbUser?.image || session.user?.image || undefined;
    }

    // Fallback profile link if username isn't set yet
    const profileHref = username ? `/u/${username}` : '/profile';

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 h-16 grid grid-cols-5 items-center">
                {/* Column 1: Brand Title */}
                <div className="flex items-center justify-start">
                    <Link
                        href="/"
                        className="font-extrabold text-white text-base sm:text-lg tracking-tight hover:text-purple-400 transition truncate"
                    >
                        playLog
                    </Link>
                </div>

                {/* Column 2: GameSearch */}
                <div className="flex items-center justify-center w-full">
                    <div className="w-full max-w-xs sm:max-w-sm relative [&_input]:h-8 [&_input]:py-1 [&_input]:text-xs [&_svg]:top-1/2 [&_svg]:-translate-y-1/2">
                        <GameSearch />
                    </div>
                </div>

                {/* Column 3: Empty */}
                <div></div>

                {/* Column 4: Community Search Bar */}
                <div className="flex items-center justify-center w-full">
                    <div className="w-full max-w-xs sm:max-w-sm relative [&_input]:h-8 [&_input]:py-1 [&_input]:text-xs [&_svg]:top-1/2 [&_svg]:-translate-y-1/2">
                        <CommunitySearchBar />
                    </div>
                </div>

                {/* Column 5: Profile / Auth State */}
                <div className="flex items-center justify-end gap-4 text-xs font-semibold">
                    {session ? (
                        /* Logged In State: Direct to /u/[username] */
                        <Link
                            href={profileHref}
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
                                    {username ? `{$username}` : (session.user?.name || 'U')[0]}
                                </div>
                            )}
                            <span className="hidden sm:inline">
                                {username ? `${username}` : (session.user?.name || 'Profile')}
                            </span>
                        </Link>
                    ) : (
                        /* Logged Out State: Show Sign In Link */
                        <Link
                            href="/login"
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