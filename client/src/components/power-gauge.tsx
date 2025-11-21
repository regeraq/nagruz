import { useEffect, useRef } from 'react';

interface PowerGaugeProps {
  maxPower: number;
}

export function PowerGauge({ maxPower }: PowerGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const needleAngleRef = useRef<number>(0);
  const isHoveredRef = useRef(false);
  const hoverAnimationRef = useRef<number>(0);
  const hoverCyclesRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 120;

    // Calculate target angle (0-100% = -135° to 135°)
    const percent = Math.min(100, (maxPower / 150) * 100);
    const targetAngle = -135 + (percent / 100) * 270; // -135 to 135 degrees

    let currentAngle = -135;
    let animationStep = 0;
    const totalSteps = 50;

    const drawGauge = (angle: number, hoverOffset: number = 0) => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Background gradient
      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 20);
      bgGradient.addColorStop(0, 'rgba(26, 148, 255, 0.02)');
      bgGradient.addColorStop(1, 'rgba(26, 148, 255, 0.05)');
      ctx.fillStyle = bgGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2);
      ctx.fill();

      // Outer circle
      ctx.strokeStyle = 'rgba(26, 148, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner circle
      ctx.strokeStyle = 'rgba(26, 148, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 40, 0, Math.PI * 2);
      ctx.stroke();

      // Draw scale (0 to 150)
      const minAngle = -135 * (Math.PI / 180);
      const maxAngle = 135 * (Math.PI / 180);

      for (let i = 0; i <= 150; i += 10) {
        const scaleAngle = minAngle + ((i / 150) * (maxAngle - minAngle));
        const isMainTick = i % 50 === 0;
        const tickLength = isMainTick ? 20 : 10;
        const tickWidth = isMainTick ? 2 : 1;

        const x1 = centerX + Math.cos(scaleAngle) * (radius - 5);
        const y1 = centerY + Math.sin(scaleAngle) * (radius - 5);
        const x2 = centerX + Math.cos(scaleAngle) * (radius - 5 - tickLength);
        const y2 = centerY + Math.sin(scaleAngle) * (radius - 5 - tickLength);

        ctx.strokeStyle = isMainTick ? 'rgba(26, 148, 255, 0.8)' : 'rgba(26, 148, 255, 0.5)';
        ctx.lineWidth = tickWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw numbers for main ticks
        if (isMainTick) {
          const numAngle = scaleAngle;
          const numX = centerX + Math.cos(numAngle) * (radius - 50);
          const numY = centerY + Math.sin(numAngle) * (radius - 50);

          ctx.fillStyle = 'rgba(26, 148, 255, 0.9)';
          ctx.font = 'bold 16px IBM Plex Mono';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(i.toString(), numX, numY);
        }
      }

      // Draw needle with hover animation
      const needleAngleRad = (angle + hoverOffset) * (Math.PI / 180);
      const needleLength = radius - 50;

      // Needle glow (subtle on hover)
      ctx.strokeStyle = hoverOffset !== 0 ? 'rgba(26, 148, 255, 0.25)' : 'rgba(26, 148, 255, 0.15)';
      ctx.lineWidth = hoverOffset !== 0 ? 14 : 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngleRad) * needleLength,
        centerY + Math.sin(needleAngleRad) * needleLength
      );
      ctx.stroke();

      // Main needle
      ctx.strokeStyle = 'hsl(210, 100%, 55%)';
      ctx.lineWidth = hoverOffset !== 0 ? 5 : 4;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngleRad) * needleLength,
        centerY + Math.sin(needleAngleRad) * needleLength
      );
      ctx.stroke();

      // Center circle glow
      ctx.fillStyle = hoverOffset !== 0 ? 'rgba(26, 148, 255, 0.3)' : 'rgba(26, 148, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Center circle
      ctx.fillStyle = 'hsl(210, 100%, 55%)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(10, 14, 39, 1)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    const animate = () => {
      animationStep++;
      const progress = animationStep / totalSteps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out

      currentAngle = -135 + (targetAngle - (-135)) * easeProgress;
      needleAngleRef.current = currentAngle;

      // Calculate hover offset - replay animation like on device switch
      let hoverOffset = 0;
      if (hoverCyclesRef.current > 0) {
        const hoverProgress = hoverAnimationRef.current / totalSteps;
        const hoverEase = 1 - Math.pow(1 - hoverProgress, 3); // Same ease out
        // Animate from start to end (same as initial animation)
        hoverOffset = (targetAngle - (-135)) * hoverEase;
        hoverAnimationRef.current++;
        
        if (hoverAnimationRef.current >= totalSteps) {
          hoverCyclesRef.current = 0;
          hoverAnimationRef.current = 0;
        }
      }

      // When hovering, use animated angle; otherwise use current angle
      const displayAngle = hoverCyclesRef.current > 0 ? (-135 + hoverOffset) : currentAngle;
      drawGauge(displayAngle, 0);

      if (animationStep < totalSteps || hoverCyclesRef.current > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Start animation after delay
    const timer = setTimeout(() => {
      animate();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [maxPower]);

  return (
    <div 
      className="flex flex-col items-center justify-center gap-6 p-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl shadow-2xl shadow-primary/30 hover:border-primary/20 hover:shadow-primary/40 transition-all duration-700 group hover:scale-105 hover:shadow-primary/50 cursor-pointer"
      onMouseEnter={() => {
        hoverCyclesRef.current = 1;
        hoverAnimationRef.current = 0;
      }}
      onMouseLeave={() => {
        // No need to reset, animation will stop after cycles complete
      }}
    >
      <canvas
        ref={canvasRef}
        className="drop-shadow-2xl drop-shadow-primary/50 transition-all duration-300 group-hover:drop-shadow-[0_0_20px_rgba(26,148,255,0.8)]"
      />

      <div className="text-center">
        <div className="text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary via-tech-cyan to-primary animate-gradient-shift">
          {maxPower} кВт
        </div>
      </div>
    </div>
  );
}
