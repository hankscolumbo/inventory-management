// app/api/export/logs/route.ts
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function escapeCsvCell(cell: any): string {
  if (cell === null || cell === undefined) return '""';
  // Double-quote replacement handles quotes, commas, and line breaks within strings
  const str = String(cell).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const logs = await prisma.gameLog.findMany({
      where: { user: { email: session.user.email } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Game Title',
      'Status',
      'Substatus',
      'Rating',
      'Playtime Hours',
      'Review',
      'Is Owned',
      'Logged Date',
      'Last Played On',
      'IGDB ID',
      'PSN IDs',
      'Steam ID',
      'Cover Art URL',
    ];

    const rows = logs.map((log) => [
      escapeCsvCell(log.gameTitle),
      escapeCsvCell(log.status),
      escapeCsvCell(log.substatus),
      escapeCsvCell(log.rating ?? ''),
      escapeCsvCell(log.playtimeHours ?? 0),
      escapeCsvCell(log.review ?? ''),
      escapeCsvCell(log.isOwned),
      escapeCsvCell(log.createdAt ?? ''),
      escapeCsvCell(log.playedOn ?? ''),
      escapeCsvCell(log.igdbId ?? ''),
      escapeCsvCell(log.psnTitleIds ?? ''),
      escapeCsvCell(log.steamAppId ?? null),
      escapeCsvCell(log.coverUrl ?? ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const filename = `gamelogs-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export game logs:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
