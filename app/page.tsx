import HomePage from "./components/HomePage";
import LiveBanner from "./components/LiveBanner";

export default function Page() {
  return (
    <div className="h-full w-full bg-neutral-900">
      <LiveBanner />
      <HomePage />
    </div>
  );
}
