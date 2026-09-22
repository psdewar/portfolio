"use client";
import { useEffect, useRef } from "react";
import { useAudio } from "app/contexts/AudioContext";

// Bars animate on a clock rather than an AnalyserNode: pulling real levels means
// routing playback through Web Audio, which is what left Safari silent.
const BAR_RATES = [2.1, 3.3, 2.7, 4.1];
const BAR_PHASES = [0, 1.3, 2.6, 0.7];

export default function BlockVisualizer() {
  const { isPlaying } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const barCount = 4;
    const gap = 3;
    const barWidth = (canvas.width - (barCount - 1) * gap) / barCount;

    const render = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = now / 1000;

      for (let i = 0; i < barCount; i++) {
        // Two out-of-phase sines per bar keep the motion from looking metronomic.
        const wave =
          0.5 +
          0.3 * Math.sin(t * BAR_RATES[i] + BAR_PHASES[i]) +
          0.2 * Math.sin(t * BAR_RATES[i] * 1.7 + BAR_PHASES[i] * 2);
        const percent = isPlaying ? wave : 40 / 255;
        const height = Math.max(4, percent * canvas.height);

        const x = i * (barWidth + gap);
        const y = canvas.height - height;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, barWidth, height);
      }

      if (isPlaying) animationRef.current = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="w-8 h-8 bg-black/70 rounded-full flex items-center justify-center p-1.5">
      <canvas ref={canvasRef} width={32} height={32} className="w-full h-full" />
    </div>
  );
}
