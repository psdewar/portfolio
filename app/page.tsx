import HomePage from "./components/HomePage";
import LiveBanner from "./components/LiveBanner";

export default function Page() {
  return (
    <div className="h-[100dvh] w-full bg-neutral-900 -mb-24 lg:-mb-32">
      <LiveBanner />
      <HomePage />
    </div>
  );
}
