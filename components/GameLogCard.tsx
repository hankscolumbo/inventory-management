import LinkIgdbModal from '@/components/LinkIgdbModal';

interface GameLogCardProps {
  log: {
    id: string;
    gameTitle: string;
    igdbId: number | null;
    coverUrl?: string | null;
  };
  isOwner?: boolean;
}

export default function GameLogCard({ log, isOwner }: GameLogCardProps) {
  const isUnmatched = !log.igdbId || log.igdbId === -1;

  return (
    <div className="relative group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
      {log.coverUrl ? (
        <img src={log.coverUrl} alt={log.gameTitle} className="w-full aspect-[3/4] object-cover" />
      ) : (
        <div className="w-full aspect-[3/4] bg-slate-950 flex flex-col items-center justify-center p-3 text-center space-y-2">
          <span className="text-2xl">🎮</span>
          <span className="text-xs font-bold text-slate-300 line-clamp-2">{log.gameTitle}</span>
          
          {isUnmatched && isOwner && (
            <div className="pt-2">
              <LinkIgdbModal logId={log.id} currentTitle={log.gameTitle} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}