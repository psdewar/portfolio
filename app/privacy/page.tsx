import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy Policy",
  description:
    "Privacy policy for social-mcp, Peyt Spencer's personal Instagram management tool.",
};

const EMAIL = "psdewar2@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="flex justify-center mb-32 pt-8">
      <div className="max-w-2xl w-full px-4">
        <h1 className="font-semibold text-3xl mb-2 text-gray-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-10">
          Effective October 2, 2026
        </p>

        <div className="space-y-8 text-neutral-600 dark:text-neutral-300 leading-relaxed">
          <section>
            <h2 className="font-semibold text-xl mb-2 text-gray-900 dark:text-white">
              What social-mcp is
            </h2>
            <p>
              social-mcp is a personal tool that Peyt Spencer uses to manage his
              own Instagram professional account (@peytspencer). It reads
              comments and messages on his own posts, replies to them, and
              publishes his own content.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-xl mb-2 text-gray-900 dark:text-white">
              Who uses it
            </h2>
            <p>
              Only the owner. social-mcp has no outside users, and no one else
              can log in to it.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-xl mb-2 text-gray-900 dark:text-white">
              Your data
            </h2>
            <p>
              Data social-mcp reads stays with the owner. It is not sold or
              shared, and it is used only to run his own account.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-xl mb-2 text-gray-900 dark:text-white">
              Deletion requests
            </h2>
            <p>
              To ask for your comments or messages to be deleted, email{" "}
              <a
                href={`mailto:${EMAIL}`}
                className="underline hover:text-gray-900 dark:hover:text-white"
              >
                {EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
