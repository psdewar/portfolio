"use client";
import { useEffect, useRef } from "react";
import { useAudio } from "app/contexts/AudioContext";

export default function BlockVisualizer() {
  const { analyser, isPlaying } = useAudio();
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

    // fftSize is 64 in AudioContext, so we have ~32 frequency bins
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // If paused, show a small "ready" state (flat line)
        dataArray.fill(40);
      }

      for (let i = 0; i < barCount; i++) {
        // Select specific frequency bands for the 4 bars:
        // Bar 0: Deep Bass (Index 1)
        // Bar 1: Mid Bass (Index 3)
        // Bar 2: Mids (Index 7)
        // Bar 3: Highs (Index 15)
        // These indices work well with fftSize=64 to get visible movement
        const indices = [1, 3, 7, 15];
        const index = indices[i] || i;

        // Get value (0-255)
        const value = isPlaying ? dataArray[index] || 0 : 40;

        // Calculate height
        // value / 255 * canvas height
        // We add a tiny minimum height (4px) so bars never disappear completely
        const percent = value / 255;
        const height = Math.max(4, percent * canvas.height);

        // Draw Bar
        const x = i * (barWidth + gap);
        const y = canvas.height - height;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, barWidth, height);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <div className="w-8 h-8 bg-black/70 rounded-full flex items-center justify-center p-1.5">
      <canvas ref={canvasRef} width={32} height={32} className="w-full h-full" />
    </div>
  );
}
