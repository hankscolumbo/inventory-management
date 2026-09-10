// app/api/cron/backfill/route.ts
import { NextResponse } from 'next/server';
import { processBackfillBatch } from '@/lib/backfill';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Protect against unauthorized hits
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await processBackfillBatch(50);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron Backfill Failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}