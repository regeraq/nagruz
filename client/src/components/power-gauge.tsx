import { useEffect, useRef } from 'react';

interface PowerGaugeProps {
  maxPower: number;
}

export function PowerGauge({ maxPower }: PowerGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const needleAngleRef = useRef<number>(-135);
  const hoverStepRef = useRef<number>(0);
  const isHoveringRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true);
  const loadStepRef = useRef<number>(0);

  useEffect(() => {
    // Reset animation state on power change
    isInitialLoadRef.current = true;
    loadStepRef.current = 0;
    hoverStepRef.current = 0;
    
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

    // Dynamically determine max scale based on input maxPower
    const scaleMax = Math.ceil(maxPower / 50) * 50; // Round up to nearest 50
    
    // Calculate target angle for current power level
    const targetAngle = -135 + (maxPower / scaleMax) * 270;
    const totalSteps = 50;

    const drawGauge = (angle: number) => {
      ctx.clearRect(0, 0, size, size);

      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 20);
      bgGradient.addColorStop(0, 'rgba(26, 148, 255, 0.02)');
      bgGradient.addColorStop(1, 'rgba(26, 148, 255, 0.05)');
      ctx.fillStyle = bgGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(26, 148, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(26, 148, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 40, 0, Math.PI * 2);
      ctx.stroke();

      const minAngle = (-135 * Math.PI) / 180;
      const maxAngle = (135 * Math.PI) / 180;

      for (let i = 0; i <= scaleMax; i += 10) {
        const scaleAngle = minAngle + ((i / scaleMax) * (maxAngle - minAngle));
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

        if (isMainTick) {
          const numX = centerX + Math.cos(scaleAngle) * (radius - 50);
          const numY = centerY + Math.sin(scaleAngle) * (radius - 50);
          ctx.fillStyle = 'rgba(26, 148, 255, 0.9)';
          ctx.font = 'bold 16px IBM Plex Mono';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(i.toString(), numX, numY);
        }
      }

      const needleAngleRad = (angle * Math.PI) / 180;
      const needleLength = radius - 50;

      ctx.strokeStyle = 'rgba(26, 148, 255, 0.15)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngleRad) * needleLength,
        centerY + Math.sin(needleAngleRad) * needleLength
      );
      ctx.stroke();

      ctx.strokeStyle = 'hsl(210, 100%, 55%)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngleRad) * needleLength,
        centerY + Math.sin(needleAngleRad) * needleLength
      );
      ctx.stroke();

      ctx.fillStyle = 'rgba(26, 148, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'hsl(210, 100%, 55%)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(10, 14, 39, 1)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      let angle = needleAngleRef.current;
      let shouldContinue = false;

      if (isHoveringRef.current && hoverStepRef.current < totalSteps) {
        shouldContinue = true;
        const progress = hoverStepRef.current / totalSteps;
        angle = -135 + (targetAngle - (-135)) * easeOutCubic(progress);
        hoverStepRef.current++;
      } else if (isInitialLoadRef.current && loadStepRef.current < totalSteps) {
        shouldContinue = true;
        const progress = loadStepRef.current / totalSteps;
        angle = -135 + (targetAngle - (-135)) * easeOutCubic(progress);
        needleAngleRef.current = angle;
        loadStepRef.current++;
      } else if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        needleAngleRef.current = targetAngle;
      }

      drawGauge(angle);

      if (shouldContinue) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [maxPower]);

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 p-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl shadow-2xl shadow-primary/30 hover:border-primary/20 hover:shadow-primary/40 transition-all duration-700 group hover:scale-105 hover:shadow-primary/50 cursor-pointer"
      onMouseEnter={() => {
        isHoveringRef.current = true;
        hoverStepRef.current = 0;
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
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
