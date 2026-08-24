// app/lists/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import AddGameToListModal from '@/components/AddGameToListModal';
import CustomListItemsManager from '@/components/CustomListItemsManager';

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
        orderBy: { position: 'asc' }, // ✅ Order entries by position
      },
    },
  });

  if (!list) notFound();

  const isOwner =
    !!session?.user &&
    (session.user.id === list.userId || session.user.email === list.user?.email);

  if (list.isPrivate && !isOwner) notFound();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
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
            {list.description && <p className="text-sm text-slate-400 mt-1">{list.description}</p>}
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

      {/* Column View with DnD and Notes */}
      <CustomListItemsManager customListId={list.id} initialItems={list.items} isOwner={isOwner} />
    </main>
  );
}
