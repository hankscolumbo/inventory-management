import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OptimisticLogList from '@/components/OptimisticLogList';
import ImportLogsModal from '@/components/ImportLogsModal';

export default async function DashboardPage() {
  const session = await auth();

  const serverLogs = await prisma.gameLog.findMany({
    where: { userId: session?.user?.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      gameTitle: true,
      igdbId: true,
      status: true,
      rating: true,
      playtimeHours: true,
      game: { select: { coverUrl: true } },
    },
  });

  const formattedLogs = serverLogs.map((l) => ({
    ...l,
    coverUrl: l.game?.coverUrl || null,
  }));

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Your Library</h1>
        <ImportLogsModal />
      </div>
      <OptimisticLogList serverLogs={formattedLogs} isOwner={true} />
    </div>
  );
}