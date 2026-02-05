import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = "psd@lyrist.app";
const FROM_NAME = "Peyt Spencer";

export async function sendOtpEmail(params: { to: string; code: string }): Promise<boolean> {
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

export async function sendGoLiveEmail(params: { to: string; firstName: string }): Promise<boolean> {
  const result = await sendGoLiveEmailBatch([params]);
  return result.sent > 0;
}

export async function sendGoLiveEmailBatch(
  recipients: Array<{ to: string; firstName: string }>
): Promise<{ sent: number; failed: number }> {
  if (recipients.length === 0) return { sent: 0, failed: 0 };

  const liveUrl = "https://peytspencer.com/live";

  let totalSent = 0;
  let totalFailed = 0;

  const messages = recipients.map(({ to, firstName }) => ({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: "I'm LIVE right now!",
    text: `Hey ${firstName},

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
    <p>Hey ${firstName},</p>
    <p>Come hang out with me at: <a href="${liveUrl}" class="cta">${liveUrl}</a></p>
    <p class="footer">
      Best,<br>
      Peyt
    </p>
  </div>
</body>
</html>`,
  }));

  try {
    await sgMail.send(messages);
    totalSent = messages.length;
  } catch (error) {
    console.error("[SendGrid] Batch send error:", error);
    totalFailed = messages.length;
  }

  return { sent: totalSent, failed: totalFailed };
}

export async function sendRsvpConfirmation(params: {
  to: string;
  name: string;
  guests: number;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
}): Promise<boolean> {
  const { to, name, guests, eventName, eventDate, eventTime, eventLocation } = params;
  const guestText = guests > 1 ? `${guests} spots` : "1 spot";
  const patronUrl = "https://peytspencer.com/patron";

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `You're in: ${eventName}`,
    text: `
Hey ${name},

You're confirmed! ${guestText} reserved.

${eventName}
${eventDate}
${eventTime}
${eventLocation}

See you there!

---

P.S. Want to support my music? Become a monthly patron and help fund new releases, tours, and creative projects: ${patronUrl}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 0 auto; padding: 32px 24px; }
    .header { font-size: 28px; font-weight: bold; color: #000; margin-bottom: 8px; }
    .confirmed { color: #16a34a; font-weight: 600; margin-bottom: 24px; }
    .event-box { background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .event-name { font-size: 20px; font-weight: bold; color: #000; margin-bottom: 8px; }
    .event-detail { color: #666; margin: 4px 0; }
    .divider { border-top: 1px solid #e5e5e5; margin: 32px 0; }
    .patron-section { background: linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%); border-radius: 12px; padding: 20px; margin-top: 24px; }
    .patron-title { font-weight: 600; color: #000; margin-bottom: 8px; }
    .patron-text { color: #666; font-size: 14px; margin-bottom: 16px; }
    .patron-cta { display: inline-block; background: linear-gradient(to right, #f97316, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { color: #999; font-size: 13px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">You're In!</div>
    <div class="confirmed">${guestText} reserved for ${name}</div>

    <div class="event-box">
      <div class="event-name">${eventName}</div>
      <div class="event-detail">${eventDate}</div>
      <div class="event-detail">${eventTime}</div>
      <div class="event-detail">${eventLocation}</div>
    </div>

    <p>See you there!</p>

    <div class="divider"></div>

    <div class="patron-section">
      <div class="patron-title">Support My Independence</div>
      <div class="patron-text">Become a monthly patron to help fund new music, tours, and creative projects.</div>
      <a href="${patronUrl}" class="patron-cta">Become a Patron</a>
    </div>

    <p class="footer">
      Questions? Just reply to this email.<br>
      — Peyt
    </p>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log(`[SendGrid] RSVP confirmation sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[SendGrid] Error sending RSVP confirmation:", error);
    return false;
  }
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
