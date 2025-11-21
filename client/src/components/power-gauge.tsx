import { useEffect, useRef } from 'react';

interface PowerGaugeProps {
  maxPower: number;
}

export function PowerGauge({ maxPower }: PowerGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Track final needle angle after initial load animation
  const finalAngleRef = useRef<number>(-135);
  
  // Hover animation state
  const isHoveringRef = useRef(false);
  const hoverStepRef = useRef(0);
  const lastMaxPowerRef = useRef(maxPower);

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

    // Calculate target angle for this power level
    const percent = Math.min(100, (maxPower / 150) * 100);
    const targetAngle = -135 + (percent / 100) * 270;

    const totalSteps = 50;

    // Draw gauge with needle at specific angle
    const drawGauge = (angle: number) => {
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

      // Draw needle
      const needleAngleRad = angle * (Math.PI / 180);
      const needleLength = radius - 50;

      // Needle glow
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

      // Main needle
      ctx.strokeStyle = 'hsl(210, 100%, 55%)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngleRad) * needleLength,
        centerY + Math.sin(needleAngleRad) * needleLength
      );
      ctx.stroke();

      // Center circle glow
      ctx.fillStyle = 'rgba(26, 148, 255, 0.2)';
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

    // Easing function
    const easeOut = (progress: number) => 1 - Math.pow(1 - progress, 3);

    // Main animation loop
    const animate = () => {
      let shouldContinue = false;
      let angleToDisplay = finalAngleRef.current;

      // Check if we should animate hover
      if (isHoveringRef.current && hoverStepRef.current < totalSteps) {
        shouldContinue = true;
        const hoverProgress = hoverStepRef.current / totalSteps;
        const hoverEase = easeOut(hoverProgress);
        // Animate from -135 to target angle
        angleToDisplay = -135 + (targetAngle - (-135)) * hoverEase;
        hoverStepRef.current++;
      }
      // Check if power changed and we need to re-animate on load
      else if (lastMaxPowerRef.current !== maxPower && finalAngleRef.current !== targetAngle) {
        shouldContinue = true;
        // Smoothly update final angle toward target
        let currentStep = 0;
        const maxLoadSteps = totalSteps;
        const loadAnimate = () => {
          currentStep++;
          const loadProgress = currentStep / maxLoadSteps;
          const loadEase = easeOut(loadProgress);
          const loadAngle = -135 + (targetAngle - (-135)) * loadEase;
          angleToDisplay = loadAngle;
          
          if (currentStep >= maxLoadSteps) {
            finalAngleRef.current = targetAngle;
            lastMaxPowerRef.current = maxPower;
          } else {
            animationFrameRef.current = requestAnimationFrame(loadAnimate);
          }
          drawGauge(loadAngle);
        };
        loadAnimate();
        return;
      }

      drawGauge(angleToDisplay);

      if (shouldContinue) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Start with initial angle draw
    drawGauge(finalAngleRef.current);

    // If power changed or first load, animate to target
    if (lastMaxPowerRef.current !== maxPower || finalAngleRef.current === -135) {
      let loadStep = 0;
      const loadAnimate = () => {
        loadStep++;
        const progress = loadStep / totalSteps;
        const ease = easeOut(progress);
        const angle = -135 + (targetAngle - (-135)) * ease;
        finalAngleRef.current = angle;
        drawGauge(angle);

        if (loadStep < totalSteps) {
          animationFrameRef.current = requestAnimationFrame(loadAnimate);
        } else {
          finalAngleRef.current = targetAngle;
          lastMaxPowerRef.current = maxPower;
        }
      };
      loadAnimate();
    }

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
        hoverStepRef.current = 0;
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
