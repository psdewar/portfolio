import Image from "next/image";
import { getUpcomingShows } from "../../lib/shows";

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
        style={{ width: "6.75in", height: "4.75in" }}
      >
        <div className="flex-1 min-w-0 flex flex-col bg-black text-white">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="font-bebas text-5xl leading-[0.95] tracking-wide">
              Help Fund
              <br />
              My Tour
            </h2>
            <div className="flex flex-col w-full" style={{ marginTop: "0.55rem" }}>
              <span className="flex items-center justify-center" style={{ backgroundColor: "#000000" }}>
                <Image
                  src="/Venmo_Logo_Blue.png"
                  alt="Venmo"
                  width={120}
                  height={25}
                  style={{ height: "0.3in", width: "auto" }}
                  unoptimized
                />
              </span>
              <span className="flex items-center justify-center" style={{ backgroundColor: "#000000" }}>
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
            <p
              className="font-bebas text-5xl leading-[0.95] tracking-wide"
              style={{ color: "#ffffff", marginTop: "0.35rem" }}
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

function QrPage({ city, print }: { city: string | null; print?: boolean }) {
  return (
    <div
      className={print ? "" : "screen-only"}
      style={{
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        marginLeft: print ? 0 : "-1.5rem",
      }}
    >
      <div
        className={`flex-1 min-w-0 flex flex-col items-center justify-center text-center ${
          print ? "text-black" : "bg-black text-white"
        }`}
        style={print ? { borderRight: "2px solid #0a0a0a" } : undefined}
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
        className="border-2 border-dashed border-neutral-400 flex items-center justify-center text-center"
        style={{ width: "6in", height: "4in" }}
      >
        <p className="text-2xl font-semibold tracking-wide text-black">peytspencer.com/support</p>
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

function PatienceTeePage({ print }: { print?: boolean }) {
  return (
    <div
      className={print ? "" : "screen-only"}
      style={{
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        marginLeft: print ? 0 : "-1.5rem",
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

export default async function SignupSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ landscape?: string }>;
}) {
  const { landscape } = await searchParams;
  const shows = await getUpcomingShows();
  const currentCity = shows[0]?.city ?? null;

  if (landscape !== undefined) {
    return (
      <>
        <style>{`
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
        `}</style>
        <div className="land-sheet">
          <QrPage city={currentCity} print />
        </div>
        <div className="land-sheet">
          <PatienceTeePage print />
        </div>
      </>
    );
  }

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
        <SizeSign word="SMALL" />
        <SizeSign word="MEDIUM" />
        <SizeSign word="LARGE" />
        <QrPage city={currentCity} />
        <hr
          className="screen-only"
          style={{
            display: "block",
            border: 0,
            height: 1,
            width: "100vw",
            marginLeft: "-1.5rem",
            backgroundColor: "#d4a553",
          }}
        />
        <RsvpQrPage />
        <hr
          className="screen-only"
          style={{
            display: "block",
            border: 0,
            height: 1,
            width: "100vw",
            marginLeft: "-1.5rem",
            backgroundColor: "#d4a553",
          }}
        />
        <PatienceTeePage />
        <DonationBoxLabel />
      </div>
    </>
  );
}
