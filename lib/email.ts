import { Resend } from 'resend'

const FROM = 'Tayco LLC <noreply@taycoturnkey.com>'
const REPLY_TO = 'general@taycoturnkey.com'

export async function sendMissingDocsEmail({
  vendorName,
  businessName,
  vendorEmail,
  missingItems,
}: {
  vendorName: string
  businessName: string
  vendorEmail: string
  missingItems: string[]
}) {
  if (!process.env.RESEND_API_KEY) return
  if (!vendorEmail || missingItems.length === 0) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const itemsList = missingItems.map(item => `• ${item}`).join('\n')

  await resend.emails.send({
    from: FROM,
    to: vendorEmail,
    replyTo: REPLY_TO,
    subject: 'Action Required: Complete Your Tayco LLC Vendor Application',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#f9fafb;">
        <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
          <img src="https://tayco-crm.vercel.app/logo.jpeg" alt="Tayco LLC" style="height:56px;width:56px;border-radius:10px;object-fit:contain;margin-bottom:20px;" />
          <h2 style="color:#1e3a5f;margin:0 0 8px;">Thank You for Applying, ${vendorName}!</h2>
          <p style="color:#4b5563;margin:0 0 20px;">We received your vendor application for <strong>${businessName}</strong> and we're excited to learn more about your company.</p>
          <p style="color:#4b5563;margin:0 0 12px;">However, we noticed your application is <strong>missing the following required item(s)</strong>:</p>
          <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
            <pre style="margin:0;font-family:Arial,sans-serif;color:#92400e;font-size:14px;white-space:pre-wrap;">${itemsList}</pre>
          </div>
          <p style="color:#4b5563;margin:0 0 20px;">Please reply to this email and attach the missing document(s) so we can continue reviewing your application.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;margin:0;">Tayco LLC — General Contractor<br/>This is an automated message. Please reply to this email if you have questions.</p>
        </div>
      </div>
    `,
  })
}
