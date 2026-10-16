import { STAMP_TEXTURE } from "../components/TicketStub";

export default function TicketThumb({ stamped }: { stamped: boolean }) {
  return (
    <span className="tt" aria-hidden="true">
      <span className="tt-title">
        From The
        <br />
        Ground Up
      </span>
      {stamped && (
        <span className="tstamp">
          <span style={{ WebkitMaskImage: STAMP_TEXTURE, maskImage: STAMP_TEXTURE }}>Admitted</span>
        </span>
      )}
    </span>
  );
}
