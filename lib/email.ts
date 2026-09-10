import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendErrorAlert(jobName: string, errorDetails: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!process.env.RESEND_API_KEY || !adminEmail) {
    console.warn('[Email Alert] Skipping alert: RESEND_API_KEY or ADMIN_EMAIL missing.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'System Alerts <onboarding@resend.dev>',
      to: adminEmail,
      subject: `🚨 [Sync Alert] Failure in ${jobName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <h2 style="color: #f43f5e; margin-top: 0;">Background Job Exception</h2>
          <p>An issue occurred during <strong>${jobName}</strong> at ${new Date().toISOString()}:</p>
          <pre style="background-color: #1e293b; padding: 15px; border-radius: 8px; color: #cbd5e1; overflow-x: auto;">${errorDetails}</pre>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email Alert] Failed to send email alert:', err);
  }
}