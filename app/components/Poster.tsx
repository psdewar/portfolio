"use client";

interface PosterProps {
  date: string;
  city: string;
  region: string;
  doorTime: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Poster({ date, city, region, doorTime }: PosterProps) {
  return (
    <>
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600&family=Parkinsans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap");

        .poster {
          width: 100%;
          aspect-ratio: 480 / 720;
          position: relative;
          overflow: hidden;
          font-family: "Parkinsans", sans-serif;
          background: #0a0a0a;
          container-type: inline-size;
        }
        @media (min-width: 768px) {
          .poster {
            width: auto;
            height: 100%;
            aspect-ratio: 480 / 720;
            border-radius: 0;
          }
        }
        .poster-bg {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          z-index: 1;
        }
        .poster::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
          z-index: 11;
          pointer-events: none;
          opacity: 0.4;
        }
        .photo-overlay {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(10, 10, 10, 0.85) 0%,
            rgba(10, 10, 10, 0.65) 15%,
            rgba(10, 10, 10, 0.22) 45%,
            transparent 70%
          );
          z-index: 3;
        }
        .bottom-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 40%;
          background: linear-gradient(
            to top,
            rgba(10, 10, 10, 0.9) 0%,
            rgba(10, 10, 10, 0.75) 25%,
            rgba(10, 10, 10, 0.4) 55%,
            transparent 100%
          );
          z-index: 4;
        }
        .poster-content {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          flex-direction: column;
          padding: 5% 6%;
        }
        .lockup {
          display: flex;
          align-items: center;
          gap: 0.625cqw;
          margin-bottom: 0.833cqw;
        }
        .lockup-img {
          height: 4.583cqw;
          width: auto;
        }
        .lockup-records {
          font-family: "Fira Sans", sans-serif;
          font-size: 3.125cqw;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 0.208cqw;
        }
        .presents {
          font-family: "Space Mono", monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e0b860;
          margin-bottom: 1.667cqw;
          margin-top: 1.667cqw;
        }
        .title-block {
          margin-bottom: auto;
        }
        .title-from {
          font-size: 5.417cqw;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #d4a553;
          line-height: 0.9;
        }
        .title-big {
          font-size: 15cqw;
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.01em;
          color: #f0ede6;
          text-transform: uppercase;
          margin-left: -0.417cqw;
        }
        .title-accent {
          width: 13.333cqw;
          height: 0.625cqw;
          background: linear-gradient(to right, #d4a553, #e8c474);
          margin: 1.25cqw 0 1.458cqw;
        }
        .the-concert {
          font-family: "Space Mono", monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e0b860;
        }
        .theme-topright {
          position: absolute;
          top: 5%;
          right: 6%;
          text-align: right;
          font-family: "Space Mono", monospace;
          font-size: 1.875cqw;
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #c0b8a8;
          line-height: 1.6;
          text-shadow: 0 0 8px rgba(0, 0, 0, 0.6);
        }
        .details {
          margin-top: auto;
          width: 100%;
        }
        .bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .bottom-left {
          display: flex;
          flex-direction: column;
          gap: 2.083cqw;
        }
        .detail-value {
          font-size: 2.917cqw;
          font-weight: 500;
          color: #c0b8a8;
          letter-spacing: 0.02em;
        }
        .detail-value.date {
          font-size: 4.167cqw;
          font-weight: 700;
          color: #f0ede6;
        }
        .tags {
          font-family: "Space Mono", monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e0b860;
          line-height: 1;
        }
        .tags-separator {
          color: #e0b860;
          opacity: 0.4;
          margin: 0 0.5em;
        }
      `}</style>
      <div className="poster">
        <img src="/Jan23OpenMicNight-08_Original.jpg" alt="" className="poster-bg" />
        <div className="photo-overlay" />
        <div className="bottom-overlay" />
        <div className="poster-content">
          <div className="theme-topright">
            <div>a rap concert by</div>
            <div>microsoft engineer</div>
            <div>peyt spencer</div>
          </div>
          <div className="lockup">
            <img src="/lyrist-trademark-white.png" alt="Lyrist" className="lockup-img" />
            <span className="lockup-records">Records</span>
          </div>
          <div className="presents">presents</div>
          <div className="title-block">
            <div className="title-from">From The</div>
            <div className="title-big">Ground</div>
            <div className="title-big" style={{ marginBottom: 0 }}>
              Up
            </div>
            <div className="title-accent" />
            <div className="the-concert">my path of growth</div>
            <div className="the-concert">and the principles</div>
            <div className="the-concert">that connect us</div>
          </div>
          <div className="details">
            <div className="bottom-row">
              <div className="bottom-left">
                <div className="tags">Free Admission</div>
                <div className="detail-value date">{formatDate(date)}</div>
                <div className="detail-value">
                  {city}, {region}
                </div>
                <div className="detail-value">Doors open at {doorTime}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
