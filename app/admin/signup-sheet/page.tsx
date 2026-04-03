"use client";

import Image from "next/image";

const ROWS = 15;

function SignupPage() {
  return (
    <div className="page">
      <div className="text-center mb-3">
        <h1 className="font-bebas text-5xl tracking-wide">Stay Connected</h1>
        <p className="text-neutral-600 text-sm mt-1">peytspencer.com</p>
      </div>

      <div className="flex gap-[6px] mb-1 px-1">
        <span className="flex-[3] text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Name</span>
        <span className="flex-[4] text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Email</span>
        <span className="flex-[2] text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Phone</span>
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
  );
}

function DonationPage() {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div
        className="border-2 border-dashed border-neutral-400 flex items-stretch overflow-hidden"
        style={{ width: "6in", height: "3.875in" }}
      >
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center bg-black text-white" style={{ paddingLeft: "0.125in", paddingRight: "0.125in" }}>
          <h2 className="font-bebas text-5xl leading-[0.95] tracking-wide">
            Support<br />the Next<br />Concert
          </h2>
          <p className="text-neutral-400 text-sm mt-1">peytspencer.com/support</p>
        </div>
        <div className="shrink-0 bg-white flex items-center justify-center" style={{ width: "3.875in" }}>
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
          main {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-root {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .page {
            height: 10in;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: white !important;
            overflow: hidden;
            break-after: page;
            break-inside: avoid;
          }
          .page:last-child {
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
      </div>
    </>
  );
}
