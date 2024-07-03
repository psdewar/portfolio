"use server";

import sendgrid from "@sendgrid/mail";
import { IdeaFormData } from "./IdeaFormData";

const { ENABLE_SENDGRID_SANDBOX, SENDER, SENDGRID_API_KEY, RECIPIENT } = process.env;

if (!ENABLE_SENDGRID_SANDBOX || !SENDER || !SENDGRID_API_KEY || !RECIPIENT) {
  throw new Error("Missing env variables");
}

sendgrid.setApiKey(SENDGRID_API_KEY);

export async function processFormData(formData: IdeaFormData) {
  console.log(formData);
  await sendgrid.send({
    to: RECIPIENT!,
    from: SENDER!,
    replyTo: formData.email,
    subject: `${formData.name}: ${formData.pitch} (${formData.appName || "TBD"})`,
    text: JSON.stringify(formData),
    html: `<pre>${JSON.stringify(formData)}</pre>`,
    mailSettings: {
      sandboxMode: { enable: ENABLE_SENDGRID_SANDBOX === "yes" },
    },
  });
}
