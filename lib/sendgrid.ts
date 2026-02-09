import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = "psd@lyrist.app";
const FROM_NAME = "Peyt Spencer";
const SITE_URL = "https://peytspencer.com";
const FROM = { email: FROM_EMAIL, name: FROM_NAME };

async function trySend(msg: Parameters<typeof sgMail.send>[0], label: string): Promise<boolean> {
  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error(`[SendGrid] ${label} error:`, error);
    return false;
  }
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    ${content}
    <div style="text-align:center;padding:32px 0 0;">
      <a href="${SITE_URL}" style="color:#c0c0bb;font-size:12px;text-decoration:none;">peytspencer.com</a>
    </div>
  </div>
</body>
</html>`;
}

function goldHeading(text: string, subtitle?: string): string {
  return `<div style="border-left:3px solid #d4a553;padding-left:16px;margin-bottom:28px;">
  <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">${text}</div>
  ${subtitle ? `<div style="color:#7a7a75;font-size:14px;">${subtitle}</div>` : ""}
</div>`;
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:block;text-align:center;background:#1a1a1a;color:#ffffff;padding:14px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">${text}</a>`;
}

function signOff(): string {
  return `<div style="color:#9a9a95;font-size:13px;margin-top:28px;">
  Reply to this email anytime.<br>Peyt
</div>`;
}

export async function sendOtpEmail(params: { to: string; code: string }): Promise<boolean> {
  const { to, code } = params;

  return trySend({
    to,
    from: FROM,
    subject: `${code} - your verification code`,
    text: `Your code: ${code}\n\nExpires in 2 minutes. If you didn't request this, ignore this email.`,
    html: emailWrapper(`
      <div style="color:#7a7a75;font-size:13px;margin-bottom:16px;">Your verification code</div>
      <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#d4a553;font-family:monospace;margin-bottom:24px;">${code}</div>
      <div style="color:#9a9a95;font-size:13px;">Expires in 2 minutes.</div>
    `),
  }, "OTP");
}

export async function sendGoLiveEmail(params: { to: string; firstName: string }): Promise<boolean> {
  const result = await sendGoLiveEmailBatch([params]);
  return result.sent > 0;
}

export async function sendGoLiveEmailBatch(
  recipients: Array<{ to: string; firstName: string }>,
): Promise<{ sent: number; failed: number }> {
  if (recipients.length === 0) return { sent: 0, failed: 0 };

  const liveUrl = `${SITE_URL}/live`;

  const messages = recipients.map(({ to, firstName }) => ({
    to,
    from: FROM,
    subject: `${firstName}, I'm live right now`,
    text: `${firstName}, I'm streaming right now. Come through: ${liveUrl}\n\nPeyt`,
    html: emailWrapper(`
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;background:#dc2626;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:4px 10px;border-radius:4px;">LIVE NOW</span>
      </div>
      <div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:6px;">${firstName}, I'm streaming right now.</div>
      <div style="color:#7a7a75;font-size:15px;margin-bottom:28px;">Come through.</div>
      ${ctaButton("Watch live", liveUrl)}
    `),
  }));

  let totalSent = 0;
  let totalFailed = 0;

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
  eventLocation?: string;
  purchasingMusic?: boolean;
}): Promise<boolean> {
  const { to, name, guests, eventName, eventDate, eventTime, eventLocation, purchasingMusic } =
    params;
  const greeting = name ? `${name}, see` : "See";
  const guestLine = guests > 1 ? `${guests} spots reserved.` : "";
  const listenUrl = `${SITE_URL}/listen`;
  const locationLine = eventLocation ? `\n${eventLocation}` : "";

  const musicNote = purchasingMusic
    ? `<div style="background:#f5f5f2;border-radius:6px;padding:14px 16px;margin-bottom:28px;color:#4a4a4a;font-size:14px;">Your music download will arrive in a separate email after checkout.</div>`
    : "";

  return trySend({
    to,
    from: FROM,
    subject: `${eventName} - You're confirmed`,
    text: `${greeting} you soon!${guestLine ? ` ${guestLine}` : ""}\n\n${eventDate}\n${eventTime}${locationLine}${purchasingMusic ? "\n\nYour music download will arrive in a separate email after checkout." : ""}\n\nGet familiar with the music before the show: ${listenUrl}\n\nPeyt`,
    html: emailWrapper(`
      ${goldHeading(`${greeting} you soon!`, guestLine || undefined)}

      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #ebebeb;">
            <div style="color:#d4a553;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Event</div>
            <div style="color:#1a1a1a;font-size:16px;font-weight:600;">${eventName}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #ebebeb;">
            <div style="color:#d4a553;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">When</div>
            <div style="color:#1a1a1a;font-size:15px;">${eventDate}</div>
            <div style="color:#7a7a75;font-size:14px;">${eventTime}</div>
          </td>
        </tr>
        ${
          eventLocation
            ? `<tr>
          <td style="padding:12px 0;border-bottom:1px solid #ebebeb;">
            <div style="color:#d4a553;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Where</div>
            <div style="color:#1a1a1a;font-size:15px;">${eventLocation}</div>
          </td>
        </tr>`
            : ""
        }
      </table>

      ${musicNote}

      <div style="margin-bottom:8px;">${ctaButton("Listen before the show", listenUrl)}</div>

      ${signOff()}
    `),
  }, "RSVP");
}

export async function sendSponsorSubmission(params: {
  name: string;
  email: string;
  city: string;
  items: string[];
}): Promise<boolean> {
  const { name, email, city, items } = params;

  const itemsHtml = items
    .map(
      (item) =>
        `<li style="color:#1a1a1a;font-size:15px;margin-bottom:8px;">${item}</li>`,
    )
    .join("");

  const itemsText = items.map((item) => `  - ${item}`).join("\n");

  return trySend({
    to: FROM_EMAIL,
    from: FROM,
    replyTo: email,
    subject: `Concert Support - ${city}`,
    text: `Concert support submission from ${name} (${email})\nCity: ${city}\n\nItems:\n${itemsText}`,
    html: emailWrapper(`
      ${goldHeading("Concert Support", city)}

      <div style="margin-bottom:20px;">
        <div style="color:#d4a553;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">From</div>
        <div style="color:#1a1a1a;font-size:15px;font-weight:600;">${name}</div>
        <div style="color:#7a7a75;font-size:14px;">${email}</div>
      </div>

      <div style="margin-bottom:28px;">
        <div style="color:#d4a553;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Support Offered</div>
        <ul style="margin:0;padding-left:20px;">${itemsHtml}</ul>
      </div>

      ${signOff()}
    `),
  }, "Sponsor submission");
}

export async function sendDownloadEmail(params: {
  to: string;
  productName: string;
  downloadUrl: string;
  expiresIn?: string;
}): Promise<boolean> {
  const { to, productName, downloadUrl, expiresIn = "30 days" } = params;
  const listenUrl = `${SITE_URL}/listen`;

  return trySend({
    to,
    from: FROM,
    subject: `${productName} is yours`,
    text: `${productName} is yours. Download it here:\n${downloadUrl}\n\nThis link expires in ${expiresIn}.\n\nMore music: ${listenUrl}\n\nPeyt`,
    html: emailWrapper(`
      ${goldHeading(`${productName} is yours.`)}

      <div style="margin-bottom:10px;">${ctaButton("Download", downloadUrl)}</div>
      <div style="text-align:center;color:#9a9a95;font-size:12px;margin-bottom:28px;">Link expires in ${expiresIn}.</div>

      <div style="border-top:1px solid #ebebeb;padding-top:20px;">
        <a href="${listenUrl}" style="color:#d4a553;text-decoration:none;font-size:14px;font-weight:500;">Hear the rest of the catalog</a>
      </div>

      ${signOff()}
    `),
  }, "Download");
}
