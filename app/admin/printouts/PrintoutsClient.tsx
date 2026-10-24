"use client";

import Image from "next/image";

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
              <div
                className="flex w-full items-center justify-center"
                style={{ marginTop: "0.55rem" }}
              >
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
              <div
                className="flex flex-col w-full"
                style={{ marginTop: "0.55rem" }}
              >
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
                <span
                  className="flex items-center justify-center"
                  style={{ backgroundColor: "#ffffff" }}
                >
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
            src="/api/qr?d=%2Fcheckin%3Fopen%3Dfund"
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

function DonationBoxLabel() {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div
        className="flex items-center justify-center text-center"
        style={{
          width: "6in",
          height: "4in",
          backgroundColor: "#262b3f",
          color: "#d4a553",
        }}
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

function CheckinHeading({
  size,
  width,
  split,
}: {
  size: string;
  width: string;
  split?: boolean;
}) {
  const words = (
    <>
      <span style={{ color: "#262b3f" }}>check in</span>
      {split ? <br /> : " "}
      <span style={{ color: "#d4a553" }}>here</span>
    </>
  );
  return split ? (
    <h2
      className="font-bebas tracking-wide text-center"
      style={{
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "nowrap",
        margin: 0,
        paddingLeft: "0.0125em",
      }}
    >
      {words}
    </h2>
  ) : (
    <h2
      className="font-bebas tracking-wide"
      style={{
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "nowrap",
        margin: 0,
        width,
        marginLeft: "0.25cqw",
        textAlign: "justify",
        textAlignLast: "justify",
      }}
    >
      {words}
    </h2>
  );
}

function CheckinUrl({
  path,
  size,
  marginTop,
}: {
  path: string;
  size: string;
  marginTop: string;
}) {
  return (
    <p
      style={{
        fontFamily: "var(--font-epunda), sans-serif",
        fontWeight: 600,
        color: "#0a0a0a",
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "nowrap",
        margin: 0,
        marginTop,
      }}
    >
      peytspencer.com{path}
    </p>
  );
}

function CheckinSign({
  path,
  headingSize,
  urlSize,
  qrTop,
  headingTop,
  urlTop,
  split,
}: {
  path: string;
  headingSize: number;
  urlSize: number;
  qrTop: number;
  headingTop: number;
  urlTop: number;
  split?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        background: "white",
      }}
    >
      <Image
        src={`/api/qr?d=${encodeURIComponent(path)}&tile=support`}
        alt="Scan to check in"
        width={1120}
        height={1120}
        style={{
          width: "105.128cqw",
          height: "105.128cqw",
          flexShrink: 0,
          maxWidth: split ? undefined : "none",
          marginTop: `${qrTop}cqw`,
        }}
        unoptimized
      />
      <div style={{ marginTop: `${headingTop}cqw` }}>
        <CheckinHeading
          size={`${headingSize}cqw`}
          width="86.15cqw"
          split={split}
        />
      </div>
      <CheckinUrl
        path={path}
        size={`${urlSize}cqw`}
        marginTop={`${urlTop}cqw`}
      />
    </div>
  );
}

const PRINT_CSS = `
  @page { size: letter portrait; margin: 0; }
  .port-sheet, .display-sheet { container-type: size; background: white; overflow: hidden; }
  @media screen {
    [class*="fixed"] { display: none !important; }
    .print-root { padding: 1.5rem; }
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
    .display-sheet {
      width: min(1080px, calc(100% - 3rem), calc((100vh - 3rem) * 9 / 16));
      aspect-ratio: 9 / 16;
      margin: 1.5rem auto;
      box-shadow: 0 0 0 1px #e5e5e5, 0 8px 24px rgba(0, 0, 0, 0.08);
    }
    .port-sheet {
      width: 8.5in;
      height: 11in;
      margin: 1.5rem auto;
      box-shadow: 0 0 0 1px #e5e5e5, 0 8px 24px rgba(0, 0, 0, 0.08);
    }
  }
  @media print {
    html, body {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
    .page, .port-sheet {
      width: 8.5in;
      height: 10.98in;
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
    .page {
      padding: 0.5in !important;
    }
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .display-sheet { display: none !important; }
  }
`;

export default function PrintoutsClient() {
  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className="print-root">
        {[0, 1].map((copy) => (
          <div key={copy} className="port-sheet">
            <CheckinSign
              path="/checkin"
              headingSize={17.4}
              urlSize={4.2}
              qrTop={-3.232}
              headingTop={-4.69}
              urlTop={3.24}
            />
          </div>
        ))}
        <div className="display-sheet">
          <CheckinSign
            path="/checkin"
            headingSize={28}
            urlSize={6.2}
            qrTop={-2.564}
            headingTop={-1.944}
            urlTop={4.4}
            split
          />
        </div>
        <DonationPage />
        <DonationPage />
        <DonationPage interac />
        <DonationPage interac />
        {["X-SMALL", "SMALL", "MEDIUM", "LARGE", "X-LARGE"].flatMap((word) =>
          [0, 1].map((copy) => <SizeSign key={`${word}-${copy}`} word={word} />),
        )}
        <DonationBoxLabel />
      </div>
    </>
  );
}
