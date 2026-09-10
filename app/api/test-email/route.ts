// app/api/test-email/route.ts
import { NextResponse } from 'next/server';
import { sendErrorAlert } from '@/lib/email';

export async function GET() {
  try {
    await sendErrorAlert(
      'System Test',
      'If you received this message, your Resend integration and lib/email.ts are configured correctly!'
    );

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully! Check your inbox.',
    });
  } catch (error: any) {
    console.error('Test email failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}