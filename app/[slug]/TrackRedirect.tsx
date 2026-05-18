"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrackRedirect({ slug, title, artist }: { slug: string; title: string; artist: string }) {
  const router = useRouter();
  const target = `/listen?play=${encodeURIComponent(slug)}`;

  useEffect(() => {
    router.replace(target);
  }, [router, target]);

  return (
    <noscript>
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <div style={{ padding: "2rem", color: "#fff", background: "#0a0a0a", minHeight: "100vh" }}>
        <a href={target} style={{ color: "#f97316" }}>
          Continue to {title} by {artist}
        </a>
      </div>
    </noscript>
  );
}
