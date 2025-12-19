import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = "psd@lyrist.app";
const FROM_NAME = "Peyt Spencer";

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
