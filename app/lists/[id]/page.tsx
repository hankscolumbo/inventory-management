// app/lists/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import AddGameToListModal from '@/components/AddGameToListModal';
import { removeGameFromList } from '@/app/actions/manageListItems';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const list = await prisma.customList.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, name: true, image: true, email: true } },
      items: {
        orderBy: { addedAt: 'desc' },
      },
    },
  });

  if (!list) {
    notFound();
  }

  const isOwner =
    !!session?.user &&
    (session.user.id === list.userId || session.user.email === list.user?.email);

  if (list.isPrivate && !isOwner) {
    notFound();
  }

  // Fetch owner's game logs so they can add them to the list
  const userLogs = isOwner
    ? await prisma.gameLog.findMany({
        where: { userId: list.userId },
        select: { gameTitle: true, coverUrl: true, igdbId: true, steamAppId: true },
        orderBy: { gameTitle: 'asc' },
      })
    : [];

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* List Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">{list.title}</h1>
              {list.isPrivate && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-950/80 border border-amber-800 text-amber-400 rounded-md">
                  Private
                </span>
              )}
            </div>
            {list.description && (
              <p className="text-sm text-slate-400 mt-1">{list.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Created by{' '}
              <Link
                href={`/u/${list.user.username}`}
                className="text-purple-400 font-semibold hover:underline"
              >
                @{list.user.username || list.user.name}
              </Link>
            </p>
          </div>

          {isOwner && <AddGameToListModal customListId={list.id} />}
        </div>
      </div>

      {/* Items Grid */}
      {list.items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-sm">
          No games have been added to this list yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {list.items.map((item) => {
            const href = item.igdbId
              ? `/game/${item.igdbId}`
              : item.steamAppId
              ? `/game/${item.steamAppId}?source=steam`
              : '#';

            return (
              <div
                key={item.id}
                className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-purple-500 transition shadow-md flex flex-col justify-between"
              >
                <Link href={href} className="block aspect-[3/4] bg-slate-950 relative overflow-hidden">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.gameTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-slate-500">
                      {item.gameTitle}
                    </div>
                  )}
                </Link>

                <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-800/60">
                  <h4 className="text-xs font-bold text-white truncate">{item.gameTitle}</h4>

                  {isOwner && (
                    <form
                      action={async () => {
                        'use server';
                        await removeGameFromList(list.id, item.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-slate-500 hover:text-red-400 text-xs font-bold p-1 transition"
                        title="Remove from list"
                      >
                        ✕
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}