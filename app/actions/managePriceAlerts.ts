// app/actions/managePriceAlerts.ts
'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getGameDeals } from '@/app/actions/getGameDeals';

export interface SetPriceAlertInput {
  gameTitle: string;
  targetPrice: number;
  steamAppId?: number | null;
  igdbId?: number | null;
}

export async function setPriceAlert(data: SetPriceAlertInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!data.gameTitle || data.targetPrice <= 0) {
    return { success: false, error: 'Invalid title or target price.' };
  }

  try {
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        userId: session.user.id,
        gameTitle: data.gameTitle,
      },
    });

    if (existingAlert) {
      const updated = await prisma.priceAlert.update({
        where: { id: existingAlert.id },
        data: {
          targetPrice: data.targetPrice,
          steamAppId: data.steamAppId,
          igdbId: data.igdbId,
          isTriggered: false,
        },
      });
      return { success: true, alert: updated };
    }

    const newAlert = await prisma.priceAlert.create({
      data: {
        userId: session.user.id,
        gameTitle: data.gameTitle,
        targetPrice: data.targetPrice,
        steamAppId: data.steamAppId,
        igdbId: data.igdbId,
        isTriggered: false,
      },
    });

    return { success: true, alert: newAlert };
  } catch (error) {
    console.error('Error setting price alert:', error);
    return { success: false, error: 'Failed to save price alert.' };
  }
}

export async function checkUserPriceAlerts() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, triggeredAlerts: [] };
  }

  try {
    const alerts = await prisma.priceAlert.findMany({
      where: {
        userId: session.user.id,
        isTriggered: true,
      },
    });

    if (alerts.length === 0) {
      return { success: true, triggeredAlerts: [] };
    }

    const formattedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const deals = await getGameDeals(alert.gameTitle, alert.steamAppId);
        const bestDeal = deals[0];

        return {
          id: alert.id,
          gameTitle: alert.gameTitle,
          salePrice: alert.lastPrice ?? alert.targetPrice,
          dealUrl: bestDeal?.dealUrl || 'https://www.cheapshark.com',
        };
      })
    );

    return { success: true, triggeredAlerts: formattedAlerts };
  } catch (error) {
    console.error('Error fetching triggered price alerts:', error);
    return { success: false, triggeredAlerts: [] };
  }
}

export async function dismissPriceAlert(alertId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  try {
    await prisma.priceAlert.delete({
      where: {
        id: alertId,
        userId: session.user.id,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Error dismissing price alert:', error);
    return { success: false };
  }
}