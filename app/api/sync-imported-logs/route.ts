// app/api/sync-imported-logs/route.ts
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendErrorAlert } from '@/lib/email';
import { NextResponse } from 'next/server';

async function getTwitchToken() {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

function sanitizeTitle(title: string): string {
  return title
    .replace(/:\s*.*$/, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  try {
    // Select logs that haven't been attempted yet
    const logsToSync = await prisma.gameLog.findMany({
      where: {
        userId: session.user.id,
        igdbId: null,
        substatus: null,
      },
      take: 10,
    });

    if (logsToSync.length === 0) {
      return NextResponse.json({ processed: 0, remaining: 0 });
    }

    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    const token = await getTwitchToken();

    if (!clientId || !token) {
      return new NextResponse('Twitch Auth Failed', { status: 500 });
    }

    let processedCount = 0;

    for (const log of logsToSync) {
      let match: { id: number; name: string; cover?: { url: string } } | null = null;
      const cleanQuery = log.gameTitle.trim().replace(/"/g, '\\"');

      let igdbRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: `fields name, cover.url; search "${cleanQuery}"; where game_type = (0, 3, 4, 8, 9, 10, 11); limit 5;`,
      });

      if (igdbRes.status === 429) {
        console.warn('IGDB rate limit encountered, pausing current batch...');
        break;
      }

      if (igdbRes.ok) {
        const games = await igdbRes.json();
        if (Array.isArray(games) && games.length > 0) {
          match = games.find((g) => g.name.toLowerCase() === log.gameTitle.toLowerCase()) || games[0];
        }
      }

      if (!match) {
        const fallbackQuery = sanitizeTitle(log.gameTitle).replace(/"/g, '\\"');
        if (fallbackQuery.length >= 2 && fallbackQuery !== cleanQuery) {
          igdbRes = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'text/plain',
            },
            body: `fields name, cover.url; search "${fallbackQuery}"; where game_type = (0, 3, 4, 8, 9, 10, 11); limit 3;`,
          });

          if (igdbRes.ok) {
            const games = await igdbRes.json();
            if (Array.isArray(games) && games.length > 0) {
              match = games[0];
            }
          }
        }
      }

      if (match) {
        const coverUrl = match.cover?.url
          ? `https:${match.cover.url.replace('t_thumb', 't_1080p')}`
          : null;

        await prisma.game.upsert({
          where: { igdbId: match.id },
          update: { name: match.name, coverUrl },
          create: {
            igdbId: match.id,
            name: match.name,
            coverUrl,
            genres: [],
            developers: [],
            platforms: [],
          },
        });

        try {
          await prisma.gameLog.update({
            where: { id: log.id },
            data: {
              igdbId: match.id,
              gameTitle: match.name,
              coverUrl,
            },
          });
        } catch (err: any) {
          // If the user already has a log entry with this igdbId, store cover without failing unique constraint
          if (err.code === 'P2002') {
            await prisma.gameLog.update({
              where: { id: log.id },
              data: {
                coverUrl,
                substatus: 'DUPLICATE_MATCH',
              },
            });
          }
        }
      } else {
        // Mark as UNMATCHED without triggering unique constraint on -1
        await prisma.gameLog.update({
          where: { id: log.id },
          data: {
            substatus: 'UNMATCHED',
          },
        });
      }

      processedCount++;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const remainingCount = await prisma.gameLog.count({
      where: {
        userId: session.user.id,
        igdbId: null,
        substatus: null,
      },
    });

    return NextResponse.json({ processed: processedCount, remaining: remainingCount });
  } catch (error: any) {
    console.error('Error syncing IGDB logs:', error);
    await sendErrorAlert('CSV Batch Sync Worker', error?.stack || String(error));
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

