// app/api/cron/check-alerts/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGameDeals } from '@/app/actions/getGameDeals';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');

  // Enforce secret check ONLY in production
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { isTriggered: false },
      include: { user: { select: { email: true, name: true } } },
    });

    let triggeredCount = 0;

    for (const alert of activeAlerts) {
      const deals = await getGameDeals(alert.gameTitle, alert.steamAppId);
      if (deals.length === 0) continue;

      const lowestDeal = deals.reduce((min, d) =>
        parseFloat(d.salePrice) < parseFloat(min.salePrice) ? d : min
      );

      const currentPrice = parseFloat(lowestDeal.salePrice);

      if (currentPrice <= alert.targetPrice) {
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { isTriggered: true, lastPrice: currentPrice },
        });

        triggeredCount++;
      }
    }

    return NextResponse.json({
      success: true,
      checked: activeAlerts.length,
      triggered: triggeredCount,
    });
  } catch (error) {
    console.error('Cron price alert error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
