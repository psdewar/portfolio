"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { isAllowedQrPath } from "../../lib/qr-paths";

const ROWS = 16;

function SignupPage() {
  return (
    <div
      className="page"
      style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
    >
      <div className="text-center">
        <h1 className="font-bebas text-5xl tracking-wide">Stay Connected with Peyt Spencer</h1>
        <p className="text-neutral-600 text-sm mt-1">
          Thank you for attending From The Ground Up, the live concert!
        </p>
      </div>

      <div>
        <div className="flex gap-[6px] mb-1 px-1">
          <span className="flex-[3] text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Name
          </span>
          <span className="flex-[4] text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Email
          </span>
          <span className="flex-[2] text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Phone
          </span>
        </div>
        <div className="flex flex-col gap-[5px]">
          {Array.from({ length: ROWS }, (_, i) => (
            <div key={i} className="flex gap-[5px]" style={{ height: "0.5in" }}>
              <div className="flex-[3] min-w-0 border-2 border-neutral-400 rounded-xl" />
              <div className="flex-[4] min-w-0 border-2 border-neutral-400 rounded-xl" />
              <div className="flex-[2] min-w-0 border-2 border-neutral-400 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonationPage({ interac }: { interac?: boolean }) {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div
        className="border-2 border-dashed border-neutral-400 flex items-stretch overflow-hidden"
        style={{ width: "6.5in", height: "4.5in" }}
      >
        <div
          className="flex-1 min-w-0 flex flex-col bg-white text-black"
          style={{ borderRight: "2px solid #0a0a0a" }}
        >
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="font-bebas text-5xl leading-[0.95] tracking-wide">
              Help Fund
              <br />
              My Tour
            </h2>
            {interac ? (
              <div className="flex w-full items-center justify-center" style={{ marginTop: "0.55rem" }}>
                <Image
                  src="/Interac_Brand_2021.png"
                  alt="Interac"
                  width={1280}
                  height={1280}
                  style={{ height: "1.1in", width: "auto" }}
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex flex-col w-full" style={{ marginTop: "0.55rem" }}>
                <span
                  className="flex items-center justify-center"
                  style={{ backgroundColor: "#ffffff", paddingTop: "0.12in" }}
                >
                  <Image
                    src="/Venmo_Logo_Blue.png"
                    alt="Venmo"
                    width={120}
                    height={25}
                    style={{ height: "0.3in", width: "auto" }}
                    unoptimized
                  />
                </span>
                <span className="flex items-center justify-center" style={{ backgroundColor: "#ffffff" }}>
                  <Image
                    src="/zelle_logo.svg"
                    alt="Zelle"
                    width={80}
                    height={32}
                    style={{ height: "0.62in", width: "auto" }}
                    unoptimized
                  />
                </span>
              </div>
            )}
            <p
              className="font-bebas text-5xl leading-[0.95] tracking-wide"
              style={{ color: "#000000", marginTop: "0.55rem" }}
            >
              or cash
            </p>
          </div>
        </div>
        <div
          className="shrink-0 bg-white flex items-center justify-center"
          style={{ width: "4.125in" }}
        >
          <Image
            src="/api/qr?d=%2Fsupport"
            alt="Scan to support"
            width={280}
            height={280}
            style={{ width: "3.625in", height: "3.625in" }}
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}

function QrPage({ city }: { city: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
      }}
    >
      <div
        className="flex-1 min-w-0 flex flex-col items-center justify-center text-center text-black"
        style={{ borderRight: "2px solid #0a0a0a" }}
      >
        <h2 className="font-bebas leading-[0.95] tracking-wide" style={{ fontSize: "10vw" }}>
          Thank You{city ? "" : "!"}
          {city && (
            <>
              <br />
              {city}!
            </>
          )}
          <br />
          <span style={{ color: "#d4a553" }}>Help Fund</span>
          <br />
          my Next
          <br />
          Tour Stop
        </h2>
      </div>
      <div className="flex-1 min-w-0 bg-white flex flex-col items-center justify-center">
        <p
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#0a0a0a",
            fontSize: "1.6vw",
            marginBottom: "0.6rem",
          }}
        >
          peytspencer.com/support
        </p>
        <Image
          src="/api/qr?d=%2Fsupport"
          alt="Scan to support"
          width={1120}
          height={1120}
          style={{ width: "78%", height: "auto", maxHeight: "78vh" }}
          unoptimized
        />
      </div>
    </div>
  );
}

function RsvpQrPage() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
      }}
    >
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center bg-black text-white">
        <h2 className="font-bebas leading-[0.95] tracking-wide" style={{ fontSize: "10vw" }}>
          Fri May 29
          <br />
          Sat May 30
          <br />
          Doors Open
          <br />
          at 7:30PM
          <br />
          <span style={{ color: "#d4a553" }}>RSVP Now</span>
        </h2>
      </div>
      <div className="flex-1 min-w-0 bg-white flex items-center justify-center">
        <Image
          src="/api/qr?d=%2Frsvp"
          alt="Scan to RSVP"
          width={1120}
          height={1120}
          style={{ width: "88%", height: "auto", maxHeight: "90vh" }}
          unoptimized
        />
      </div>
    </div>
  );
}

function DonationBoxLabel() {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div
        className="flex items-center justify-center text-center"
        style={{ width: "6in", height: "4in", backgroundColor: "#262b3f", color: "#d4a553" }}
      >
        <p
          className="text-2xl leading-relaxed"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          Thanks for your participation
          <br />
          in my concert-conversation
        </p>
      </div>
    </div>
  );
}

function ThankYouCard() {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div
        className="border-2 border-dashed border-neutral-400 flex items-stretch overflow-hidden"
        style={{ width: "6.5in", height: "4.5in" }}
      >
        <div
          className="flex-1 min-w-0 flex flex-col items-center justify-center text-center bg-white text-black"
          style={{ borderRight: "2px solid #0a0a0a" }}
        >
          <h2 className="font-bebas text-5xl leading-[0.95] tracking-wide">
            Thanks For
            <br />
            Being Here
            <br />
            <span style={{ color: "#d4a553" }}>Help Fund</span>
            <br />
            my Next
            <br />
            Tour Stop
          </h2>
        </div>
        <div
          className="shrink-0 bg-white flex items-center justify-center"
          style={{ width: "4.125in" }}
        >
          <Image
            src="/api/qr?d=%2Fsupport"
            alt="Scan to support"
            width={280}
            height={280}
            style={{ width: "3.625in", height: "3.625in" }}
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}

function SizeSign({ word }: { word: string }) {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <span
        className="tracking-wide text-black"
        style={{
          fontFamily: "var(--font-parkinsans), sans-serif",
          fontSize: "1.5in",
          fontWeight: 800,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </span>
    </div>
  );
}

function PatienceTeePage() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
      }}
    >
      <div className="flex-1 min-w-0 flex">
        {["navy", "forest", "maroon"].map((color) => (
          <div
            key={color}
            className="flex-1 min-w-0"
            style={{
              backgroundImage: `url(/images/merch/patience-${color}.jpeg)`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "350%",
              backgroundPosition: "center 43%",
            }}
          />
        ))}
      </div>
      <div className="flex-1 min-w-0 bg-white flex flex-col items-center justify-center">
        <p
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#0a0a0a",
            fontSize: "1.6vw",
            marginBottom: "0.6rem",
          }}
        >
          peytspencer.com/shop
        </p>
        <Image
          src="/api/qr?d=%2Fshop"
          alt="Scan to shop the Patience tee"
          width={1120}
          height={1120}
          style={{ width: "78%", height: "auto", maxHeight: "78vh" }}
          unoptimized
        />
      </div>
    </div>
  );
}

function TicketQrPage({ path }: { path: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        background: "white",
      }}
    >
      <h2
        className="font-bebas tracking-wide text-center"
        style={{ fontSize: "0.85in", lineHeight: 0.98 }}
      >
        <span style={{ color: "#262b3f" }}>Tell Me Your Name</span>
        <br />
        <span style={{ color: "#d4a553" }}>Get Your Free Ticket</span>
      </h2>
      <Image
        src={`/api/qr?d=${encodeURIComponent(path)}`}
        alt="Scan for your free ticket"
        width={1120}
        height={1120}
        style={{ width: "7in", height: "7in", marginTop: "0.5in" }}
        unoptimized
      />
    </div>
  );
}

function QrColumn({ qrPath, caption, alt }: { qrPath: string; caption: string; alt: string }) {
  return (
    <div className="flex-1 min-w-0 bg-white flex flex-col items-center justify-center">
      <p
        style={{
          fontFamily: "var(--font-space-mono), monospace",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#0a0a0a",
          fontSize: "0.16in",
          marginBottom: "0.2in",
        }}
      >
        {caption}
      </p>
      <Image
        src={`/api/qr?d=${encodeURIComponent(qrPath)}`}
        alt={alt}
        width={560}
        height={560}
        style={{ width: "4in", height: "4in" }}
        unoptimized
      />
    </div>
  );
}

function SupportPreorderPage({ supportPath, shopPath }: { supportPath: string; shopPath: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        background: "white",
      }}
    >
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden bg-white">
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center text-black">
          <h2
            className="font-bebas leading-[0.92] tracking-wide"
            style={{ fontSize: "0.9in", color: "#262b3f" }}
          >
            Fund My
            <br />
            Tour
            <br />
            Across
            <br />
            <span style={{ color: "#d4a553" }}>North</span>
            <br />
            <span style={{ color: "#d4a553" }}>America</span>
          </h2>
        </div>
        <QrColumn qrPath={supportPath} caption={`peytspencer.com${supportPath}`} alt="Scan to support" />
      </div>

      <div style={{ borderTop: "2px solid #0a0a0a" }} />

      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden bg-white">
        <div className="flex-1 min-w-0 flex">
          {["navy", "forest", "maroon"].map((color) => (
            <div
              key={color}
              className="flex-1 min-w-0"
              style={{
                backgroundImage: `url(/images/merch/patience-${color}.jpeg)`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                backgroundPosition: "center 38%",
              }}
            />
          ))}
        </div>
        <QrColumn
          qrPath={shopPath}
          caption={`peytspencer.com${shopPath}`}
          alt="Scan to pre-order the Patience tee"
        />
      </div>
    </div>
  );
}

const PORTRAIT_CSS = `
  @media print {
    @page {
      size: letter;
      margin: 0.5in;
    }
    html {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }
    nav, footer, header, [class*="fixed"], [class*="sticky"] {
      display: none !important;
    }
    body > div {
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: white !important;
    }
    body > div > *:not(.print-root) {
      display: none !important;
    }
    .print-root {
      padding: 0 !important;
      margin: 0 !important;
      max-width: none !important;
    }
    .page {
      width: 7.5in;
      height: 10in;
      padding: 0 !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      border: none !important;
      background: white !important;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
  @media screen {
    [class*="fixed"] { display: none !important; }
    .print-root {
      padding: 1.5rem;
    }
    .page {
      max-width: 48rem;
      margin: 0 auto;
      background: white;
      padding: 1.5rem;
    }
    .page + .page {
      margin-top: 2rem;
      border-top: 2px dashed #ccc;
      padding-top: 2rem;
    }
  }
`;

const LANDSCAPE_CSS = `
  @page { size: letter landscape; margin: 0; }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    header, nav, footer, [class*="fixed"], [class*="sticky"] { display: none !important; }
    .land-sheet { break-after: page; page-break-after: always; }
    .land-sheet:last-child { break-after: auto; page-break-after: auto; }
  }
  @media screen {
    .land-sheet + .land-sheet {
      border-top: 1px solid #d4a553;
    }
  }
`;

const PORTRAIT_FULL_CSS = `
  @page { size: letter portrait; margin: 0; }
  .port-sheet { background: white; overflow: hidden; }
  @media screen {
    .port-sheet {
      width: 8.5in;
      height: 11in;
      margin: 1.5rem auto;
      box-shadow: 0 0 0 1px #e5e5e5, 0 8px 24px rgba(0, 0, 0, 0.08);
    }
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    header, nav, footer, [class*="fixed"], [class*="sticky"] { display: none !important; }
    .port-sheet { width: 100vw; height: 100vh; break-after: page; page-break-after: always; }
    .port-sheet:last-child { break-after: auto; page-break-after: auto; }
  }
`;

const TAB_CSS = {
  general: PORTRAIT_CSS,
  screensavers: LANDSCAPE_CSS,
  concert: PORTRAIT_FULL_CSS,
} as const;

type QrDef = { label: string; path: string };

const STATIC_LEGEND: Record<"general" | "screensavers", QrDef[]> = {
  general: [{ label: "Support", path: "/support" }],
  screensavers: [
    { label: "Support", path: "/support" },
    { label: "RSVP", path: "/rsvp" },
    { label: "Patience pre-order", path: "/shop" },
  ],
};

type QrStatus = "idle" | "checking" | "ok" | "invalid";

interface QrItem {
  id: "ticket" | "support" | "shop";
  label: string;
  path: string;
  enabled: boolean;
  status: QrStatus;
  nonce: number;
}

const STATUS_TEXT: Record<QrStatus, string> = {
  idle: "",
  checking: "Checking link...",
  ok: "Valid link",
  invalid: "Won't resolve, fix or turn off",
};

const STATUS_COLOR: Record<QrStatus, string> = {
  idle: "text-neutral-500",
  checking: "text-neutral-500",
  ok: "text-emerald-600",
  invalid: "text-red-600",
};

async function confirmLink(path: string): Promise<boolean> {
  if (!isAllowedQrPath(path)) return false;
  const checkUrl = path.startsWith("/ticket") ? `${path}?preview=1` : path;
  try {
    const res = await fetch(checkUrl, { method: "HEAD", redirect: "manual" });
    return res.ok;
  } catch {
    return false;
  }
}

function QrReference({ codes }: { codes: QrDef[] }) {
  return (
    <div className="print:hidden border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
          QR reference (screen only, not printed)
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {codes.map((c) => (
            <div
              key={c.path}
              className="shrink-0 flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white px-2 py-2"
            >
              <Image
                src={`/api/qr?d=${encodeURIComponent(c.path)}`}
                alt={c.label}
                width={56}
                height={56}
                style={{ width: 56, height: 56 }}
                unoptimized
              />
              <div className="min-w-0">
                <p className="whitespace-nowrap text-xs font-semibold text-neutral-900">{c.label}</p>
                <p className="whitespace-nowrap text-[11px] text-neutral-500">
                  peytspencer.com{c.path}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditableQrReference({
  items,
  onCommit,
  onToggle,
}: {
  items: QrItem[];
  onCommit: (id: QrItem["id"], path: string) => void;
  onToggle: (id: QrItem["id"]) => void;
}) {
  return (
    <div className="print:hidden border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
          QR reference, edit a link to re-check and regenerate (screen only, not printed)
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((it) => (
            <div
              key={it.id}
              className={`shrink-0 flex items-start gap-3 rounded-lg border bg-white px-3 py-2 ${
                it.enabled
                  ? "border-neutral-200 dark:border-neutral-700"
                  : "border-neutral-200 opacity-50"
              }`}
            >
              <Image
                key={`${it.path}-${it.nonce}`}
                src={`/api/qr?d=${encodeURIComponent(it.path)}&v=${it.nonce}`}
                alt={it.label}
                width={72}
                height={72}
                style={{ width: 72, height: 72 }}
                unoptimized
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-900">{it.label}</span>
                  {it.id === "ticket" && (
                    <button
                      type="button"
                      onClick={() => onToggle(it.id)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        it.enabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-neutral-200 text-neutral-500"
                      }`}
                    >
                      {it.enabled ? "On" : "Off"}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  defaultValue={it.path}
                  spellCheck={false}
                  onBlur={(e) => onCommit(it.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="mt-1 w-52 rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-[11px] text-neutral-900 focus:border-[#d4a553] focus:outline-none"
                  placeholder="/ticket/show-slug"
                />
                <p className={`mt-0.5 text-[11px] ${STATUS_COLOR[it.status]}`}>
                  {it.status === "idle" ? `peytspencer.com${it.path}` : STATUS_TEXT[it.status]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PrintoutsClient({
  currentCity,
  ticketSlug,
}: {
  currentCity: string | null;
  ticketSlug: string | null;
}) {
  const [tab, setTab] = useState<keyof typeof TAB_CSS>("general");

  const [items, setItems] = useState<QrItem[]>(() => [
    {
      id: "ticket",
      label: "Free ticket",
      path: ticketSlug ? `/ticket/${ticketSlug}` : "/ticket",
      enabled: Boolean(ticketSlug),
      status: "idle",
      nonce: 0,
    },
    { id: "support", label: "Fund the tour", path: "/fund", enabled: true, status: "idle", nonce: 0 },
    { id: "shop", label: "Patience pre-order", path: "/shop", enabled: true, status: "idle", nonce: 0 },
  ]);

  const byId = Object.fromEntries(items.map((it) => [it.id, it])) as Record<QrItem["id"], QrItem>;

  const reqTokens = useRef<Record<string, number>>({});

  const commit = (id: QrItem["id"], rawPath: string) => {
    const path = rawPath.trim() || "/";
    const token = (reqTokens.current[id] ?? 0) + 1;
    reqTokens.current[id] = token;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, path, status: "checking" } : it)));
    confirmLink(path).then((ok) => {
      if (reqTokens.current[id] !== token) return; // superseded by a newer edit
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: ok ? "ok" : "invalid", nonce: it.nonce + 1 } : it,
        ),
      );
    });
  };

  const toggle = (id: QrItem["id"]) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)));

  useEffect(() => {
    for (const it of items) commit(it.id, it.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{TAB_CSS[tab]}</style>

      <div className="print:hidden sticky top-0 z-40 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {(["general", "screensavers", "concert"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold tracking-[0.1em] uppercase border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-[#d4a553] text-[#d4a553]"
                  : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "concert" ? (
        <EditableQrReference items={items} onCommit={commit} onToggle={toggle} />
      ) : (
        <QrReference codes={STATIC_LEGEND[tab]} />
      )}

      {tab === "general" ? (
        <div className="print-root">
          <SignupPage />
          <SignupPage />
          <DonationPage />
          <DonationPage />
          <DonationPage interac />
          <DonationPage interac />
          <ThankYouCard />
          <SizeSign word="SMALL" />
          <SizeSign word="MEDIUM" />
          <SizeSign word="LARGE" />
          <DonationBoxLabel />
        </div>
      ) : tab === "screensavers" ? (
        <>
          <div className="land-sheet">
            <QrPage city={currentCity} />
          </div>
          <div className="land-sheet">
            <RsvpQrPage />
          </div>
          <div className="land-sheet">
            <PatienceTeePage />
          </div>
        </>
      ) : (
        <>
          {byId.ticket.enabled && (
            <div className="port-sheet">
              <TicketQrPage path={byId.ticket.path} />
            </div>
          )}
          <div className="port-sheet">
            <SupportPreorderPage supportPath={byId.support.path} shopPath={byId.shop.path} />
          </div>
        </>
      )}
    </>
  );
}
