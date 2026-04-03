import Image from "next/image";

export default function ScreensaverPage() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="flex items-stretch overflow-hidden" style={{ width: "60vw", maxWidth: "900px", aspectRatio: "6 / 3.875" }}>
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center text-white" style={{ paddingLeft: "0.125in", paddingRight: "0.125in" }}>
          <h2 className="font-bebas text-5xl lg:text-7xl leading-[0.95] tracking-wide">
            Support<br />the Next<br />Concert
          </h2>
          <p className="text-neutral-400 text-sm lg:text-base mt-1">peytspencer.com/support</p>
        </div>
        <div className="shrink-0 bg-white flex items-center justify-center" style={{ aspectRatio: "1", height: "100%" }}>
          <Image
            src="https://assets.peytspencer.com/images/support-qr-s10.png"
            alt="Scan to support"
            width={400}
            height={400}
            className="w-[90%] h-[90%] object-contain"
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
