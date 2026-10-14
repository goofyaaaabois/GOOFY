import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  mode: 'LISTENING' | 'SPEAKING' | 'IDLE';
  audioLevel?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  mode,
  audioLevel = 10,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Draw center baseline
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      if (!isActive && mode === 'IDLE') {
        // Idle calm pulse
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const y = midY + Math.sin(x * 0.04 + phase) * 2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Active Waveform (Listening / Speaking)
        const barCount = 36;
        const barWidth = width / barCount - 2;
        const multiplier = mode === 'LISTENING' ? Math.max(15, audioLevel * 1.5) : 30;

        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 2);
          const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
          const envelope = Math.cos(distFromCenter * Math.PI * 0.5);
          
          // Dynamic frequency calculation
          const waveHeight = Math.sin(i * 0.4 + phase) * Math.cos(i * 0.2 - phase) * multiplier * envelope;
          const clampedHeight = Math.max(3, Math.abs(waveHeight));

          // Color gradient from yellow to gold
          const alpha = 0.4 + (clampedHeight / multiplier) * 0.6;
          ctx.fillStyle = mode === 'SPEAKING'
            ? `rgba(250, 204, 21, ${alpha})`
            : `rgba(234, 179, 8, ${alpha})`;

          ctx.fillRect(x, midY - clampedHeight / 2, barWidth, clampedHeight);
        }
      }

      phase += mode === 'SPEAKING' ? 0.15 : 0.08;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, mode, audioLevel]);

  return (
    <div className="w-full flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={320}
        height={48}
        className="w-full max-w-sm h-10 rounded border border-neutral-800/80 bg-black/60 shadow-inner"
      />
      <div className="flex justify-between w-full max-w-sm px-1 mt-1 text-[9px] font-mono-code text-neutral-400">
        <span>FREQ: 24kHz</span>
        <span>AUDIO SPECTRUM</span>
        <span>{mode}</span>
      </div>
    </div>
  );
};
