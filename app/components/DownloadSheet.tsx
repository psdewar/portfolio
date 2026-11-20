"use client";

import { useRef, useState } from "react";
import posthog from "posthog-js";
import ContributeSheet, { useContributeCheckout } from "./ContributeSheet";
import { PAYMENT_OPTIONS_STYLE } from "./PaymentOptions";
import { grossUpCents, formatDollars } from "../lib/fees";
import { CHECKOUT_OPEN_ERROR, errorMessage, postJson } from "../lib/network-error";

const DOWNLOAD_ROW =
  "group flex w-full cursor-pointer px-4 py-4 focus:outline-none disabled:cursor-default";
const DOWNLOAD_CTA =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 py-2 text-center text-[clamp(15px,4.6vw,18px)] font-semibold bg-neutral-900 text-white transition-colors group-hover:bg-neutral-700 group-active:bg-neutral-800 group-disabled:opacity-70 dark:bg-white dark:text-neutral-900 dark:group-hover:bg-neutral-200 dark:group-active:bg-neutral-300 group-focus-visible:ring-2 group-focus-visible:ring-orange-500 group-focus-visible:ring-offset-2 dark:group-focus-visible:ring-offset-neutral-950";

type DownloadSecret = { clientSecret: string; sessionId: string };

async function createDownloadSecret(productId: string): Promise<DownloadSecret> {
  const res = await postJson("/api/create-checkout-session", { productId, embedded: true });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.clientSecret || !data.sessionId) throw new Error(data.error);
  return data;
}

function DownloadCheckout({
  secret,
  onClose,
}: {
  secret: DownloadSecret;
  onClose: () => void;
}) {
  const checkout = useContributeCheckout({
    onClose,
    onPaid: () => {
      window.location.href = `/download?session_id=${secret.sessionId}`;
    },
    redirect: false,
    presetSecret: secret.clientSecret,
  });

  return (
    <ContributeSheet
      checkout={checkout}
      title="Download"
      label="Download by card"
      onClose={onClose}
      onBack={onClose}
      completeLine="Getting your download"
    />
  );
}

export default function DownloadButton({
  productId,
  netCents,
}: {
  productId: string;
  netCents: number;
}) {
  const [secret, setSecret] = useState<DownloadSecret | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  const open = async () => {
    if (busy.current) return;
    busy.current = true;
    setCreating(true);
    setError("");
    try {
      setSecret(await createDownloadSecret(productId));
      posthog.capture("download_checkout_open", { track: productId });
    } catch (e) {
      setError(errorMessage(e, CHECKOUT_OPEN_ERROR));
    } finally {
      busy.current = false;
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center">
        <button type="button" onClick={open} disabled={creating} className={DOWNLOAD_ROW}>
          <span className={DOWNLOAD_CTA}>
            {creating ? (
              <>
                <span className="cc-spinner" />
                Opening checkout
              </>
            ) : (
              `Download for ${formatDollars(grossUpCents(netCents))} so I receive ${formatDollars(netCents)}`
            )}
          </span>
        </button>
        {error && <p className="px-4 pb-4 text-center text-sm text-red-500">{error}</p>}
      </div>
      {secret && (
        <DownloadCheckout secret={secret} onClose={() => setSecret(null)} />
      )}
      <style>{PAYMENT_OPTIONS_STYLE}</style>
    </>
  );
}
