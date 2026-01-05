import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = "psd@lyrist.app";
const FROM_NAME = "Peyt Spencer";

export async function sendOtpEmail(params: {
  to: string;
  code: string;
}): Promise<boolean> {
  const { to, code } = params;

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `${code} is your Peyt Spencer Live code`,
    text: `
Your verification code is: ${code}

This code expires in 2 minutes.

If you didn't request this, you can ignore this email.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000; margin: 24px 0; }
    .footer { color: #666; font-size: 14px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <p>Your verification code is:</p>
    <p class="code">${code}</p>
    <p class="footer">
      This code expires in 2 minutes.<br>
      If you didn't request this, you can ignore this email.
    </p>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log(`[SendGrid] OTP email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[SendGrid] Error sending OTP email:", error);
    return false;
  }
}

export async function sendGoLiveEmail(params: {
  to: string;
  firstName: string;
}): Promise<boolean> {
  const result = await sendGoLiveEmailBatch([params]);
  return result.sent > 0;
}

export async function sendGoLiveEmailBatch(
  recipients: Array<{ to: string; firstName: string }>,
): Promise<{ sent: number; failed: number }> {
  if (recipients.length === 0) return { sent: 0, failed: 0 };

  const liveUrl = "https://peytspencer.com/live";
  const BATCH_SIZE = 1000;

  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const msg = {
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: "I'm LIVE right now!",
      personalizations: batch.map(({ to, firstName }) => ({
        to: [{ email: to }],
        substitutions: { "-firstName-": firstName },
      })),
      text: `Hey -firstName-,

Come hang out with me at: ${liveUrl}

Best,
Peyt`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .cta { display: inline-block; background: #3b82f6; color: white; padding: 12px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <p>Hey -firstName-,</p>
    <p>Come hang out with me at: <a href="${liveUrl}" class="cta">${liveUrl}</a></p>
    <p class="footer">
      Best,<br>
      Peyt
    </p>
  </div>
</body>
</html>`,
    };

    try {
      await sgMail.send(msg);
      totalSent += batch.length;
    } catch (error) {
      console.error("[SendGrid] Batch send error:", error);
      totalFailed += batch.length;
    }
  }

  return { sent: totalSent, failed: totalFailed };
}

export async function sendDownloadEmail(params: {
  to: string;
  productName: string;
  downloadUrl: string;
  expiresIn?: string;
}): Promise<boolean> {
  const { to, productName, downloadUrl, expiresIn = "30 days" } = params;

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Your download: ${productName}`,
    text: `
Thanks for your purchase!

Download your file here:
${downloadUrl}

This link expires in ${expiresIn}.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .footer { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <p>Thanks for your purchase!</p>
    <p>When you're ready, use <a href="${downloadUrl}" target="_blank">${downloadUrl}</a> to download <strong>${productName}</strong>.</p>
    <p class="footer">
      This link expires in ${expiresIn}.<br>
      Questions? Reply to this email.
    </p>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log(`[SendGrid] Download email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[SendGrid] Error sending email:", error);
    return false;
  }
}
