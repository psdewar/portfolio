import { LOCKUP_CSS } from "../lib/lockup";

export default function Lockup() {
  return (
    <>
      <style>{LOCKUP_CSS}</style>
      <div className="lockup">
        <img src="/lyrist-trademark-white.png" alt="Lyrist" className="lockup-img" />
        <span className="lockup-records">Records</span>
      </div>
    </>
  );
}
