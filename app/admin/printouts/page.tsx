"use client";

import Image from "next/image";

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

function DonationPage() {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div
        className="border-2 border-dashed border-neutral-400 flex items-stretch overflow-hidden"
        style={{ width: "6.25in", height: "4.25in" }}
      >
        <div
          className="flex-1 min-w-0 flex flex-col items-center justify-center text-center bg-black text-white"
          style={{ paddingLeft: "0.125in", paddingRight: "0.125in" }}
        >
          <h2 className="font-bebas text-5xl leading-[0.95] tracking-wide">
            Support
            <br />
            the Next
            <br />
            Concert
          </h2>
        </div>
        <div
          className="shrink-0 bg-white flex items-center justify-center"
          style={{ width: "4.125in" }}
        >
          <Image
            src="https://assets.peytspencer.com/images/support-qr-s10.png"
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

function QrPage() {
  return (
    <div
      className="screen-only"
      style={{
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        marginLeft: "-1.5rem",
      }}
    >
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center bg-black text-white">
        <h2 className="font-bebas leading-[0.95] tracking-wide" style={{ fontSize: "10vw" }}>
          Thank You
          <br />
          Vancouver!
          <br />
          Support
          <br />
          the Next
          <br />
          Concert
        </h2>
      </div>
      <div className="flex-1 min-w-0 bg-white flex items-center justify-center">
        <Image
          src="https://assets.peytspencer.com/images/support-qr-s100.png"
          alt="Scan to support"
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
        className="border-2 border-dashed border-neutral-400 flex items-center justify-center text-center"
        style={{ width: "6in", height: "4in" }}
      >
        <p className="text-2xl font-semibold tracking-wide text-black">peytspencer.com/support</p>
      </div>
    </div>
  );
}

export default function SignupSheetPage() {
  return (
    <>
      <style>{`
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
          .screen-only {
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
      `}</style>

      <div className="print-root">
        <SignupPage />
        <SignupPage />
        <DonationPage />
        <DonationPage />
        <QrPage />
        <DonationBoxLabel />
      </div>
    </>
  );
}
