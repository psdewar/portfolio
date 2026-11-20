"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrackRedirect({ slug, title, artist }: { slug: string; title: string; artist: string }) {
  const router = useRouter();
  const target = `/listen?play=${encodeURIComponent(slug)}`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("play", slug);
    router.replace(`/listen?${params}`);
  }, [router, slug]);

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
