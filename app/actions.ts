"use server";

import sendgrid from "@sendgrid/mail";
import { IdeaFormData } from "./IdeaFormData";
import { createClient } from "@supabase/supabase-js";

export interface ContactFormData {
  firstName: string;
  email: string;
  phone: string;
}

const {
  ENABLE_SENDGRID_SANDBOX,
  SENDER,
  SENDGRID_API_KEY,
  RECIPIENT,
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
} = process.env;

if (
  !ENABLE_SENDGRID_SANDBOX ||
  !SENDER ||
  !SENDGRID_API_KEY ||
  !RECIPIENT ||
  !NEXT_PUBLIC_SUPABASE_URL ||
  !NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  throw new Error("Missing env variables");
}
const client = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
sendgrid.setApiKey(SENDGRID_API_KEY);

export async function processFormData(formData: IdeaFormData) {
  if (process.env.NODE_ENV === "development") {
    console.log(formData);
  }
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

const toDelimited = (c: ContactFormData, delim = ",") => {
  const createdAt = Date.now();
  return [c.firstName, c.email, c.phone ?? "", createdAt]
    .map((v) => String(v).replaceAll(delim, `\\${delim}`))
    .join(delim);
};
export async function processStayConnected(formData: ContactFormData) {
  if (process.env.NODE_ENV === "development") {
    console.log("Processing stay connected form data:", formData);
  }

  if (!formData || !formData.firstName || !formData.email) {
    return {
      data: null,
      error: { message: "Invalid form data: missing required fields" },
    };
  }

  try {
    const entryData = toDelimited(formData);
    if (process.env.NODE_ENV === "development") {
      console.log("Entry data:", entryData);
    }

    const { data, error } = await client.from("stay-connected").insert({ entry: entryData });

    if (process.env.NODE_ENV === "development") {
      console.log("Database result:", { data, error });
    }

    return { data, error };
  } catch (err) {
    console.error("Error in processStayConnected:", err);
    return {
      data: null,
      error: { message: "Database operation failed" },
    };
  }
}
