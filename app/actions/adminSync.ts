//app/actions/adminSync.ts

'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function verifyAdmin() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!session?.user?.email || (adminEmail && session.user.email !== adminEmail)) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function getSyncStats() {
  await verifyAdmin();

  const [total, synced, pending, failed] = await Promise.all([
    prisma.gameLog.count(),
    prisma.gameLog.count({ where: { igdbId: { gt: 0 } } }),
    prisma.gameLog.count({ where: { igdbId: null } }),
    prisma.gameLog.count({ where: { igdbId: -1 } }),
  ]);

  return { total, synced, pending, failed };
}

export async function getUnsyncedLogs() {
  await verifyAdmin();

  return await prisma.gameLog.findMany({
    where: {
      OR: [{ igdbId: null }, { igdbId: -1 }],
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      gameTitle: true,
      igdbId: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });
}

export async function resetFailedLogs() {
  await verifyAdmin();

  const result = await prisma.gameLog.updateMany({
    where: { igdbId: -1 },
    data: { igdbId: null },
  });

  revalidatePath('/admin/sync-status');
  return { success: true, count: result.count };
}
