import { useEffect, useRef } from 'react';

interface PowerGaugeProps {
  maxPower: number;
  deviceName: string;
}

export function PowerGauge({ maxPower, deviceName }: PowerGaugeProps) {
  const needleRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    if (!needleRef.current) return;

    // Animate needle from 0 to current power
    let currentAngle = -90; // Start at 0
    const targetAngle = -90 + (maxPower / 150) * 180; // Max 150kW = 180 degrees
    const steps = 60;
    let step = 0;

    const animate = () => {
      step++;
      const progress = step / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out
      const angle = currentAngle + (targetAngle - currentAngle) * easeProgress;
      
      const needle = needleRef.current;
      if (needle) {
        needle.style.transform = `rotate(${angle}deg)`;
        needle.style.transformOrigin = 'center';
      }

      if (step < steps) {
        requestAnimationFrame(animate);
      }
    };

    // Delay animation start
    setTimeout(() => {
      animate();
    }, 300);
  }, [maxPower]);

  const centerX = 150;
  const centerY = 150;
  const radius = 120;

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl shadow-2xl shadow-primary/30 hover:border-primary/50 hover:shadow-primary/50 transition-all duration-500 group">
      <svg
        width="300"
        height="280"
        viewBox="0 0 300 280"
        className="drop-shadow-2xl drop-shadow-primary/50"
      >
        {/* Background circle */}
        <circle cx={centerX} cy={centerY} r={radius} fill="rgba(26, 148, 255, 0.05)" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.3" />

        {/* Major tick marks */}
        {[...Array(7)].map((_, i) => {
          const angle = -90 + (i / 6) * 180;
          const rad = (angle * Math.PI) / 180;
          const x1 = centerX + Math.cos(rad) * (radius - 10);
          const y1 = centerY + Math.sin(rad) * (radius - 10);
          const x2 = centerX + Math.cos(rad) * (radius - 25);
          const y2 = centerY + Math.sin(rad) * (radius - 25);
          
          return (
            <line
              key={`tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              opacity="0.6"
            />
          );
        })}

        {/* Minor tick marks */}
        {[...Array(31)].map((_, i) => {
          if (i % 5 === 0) return null;
          const angle = -90 + (i / 30) * 180;
          const rad = (angle * Math.PI) / 180;
          const x1 = centerX + Math.cos(rad) * (radius - 12);
          const y1 = centerY + Math.sin(rad) * (radius - 12);
          const x2 = centerX + Math.cos(rad) * (radius - 20);
          const y2 = centerY + Math.sin(rad) * (radius - 20);
          
          return (
            <line
              key={`tick-minor-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              opacity="0.4"
            />
          );
        })}

        {/* Scale numbers */}
        {[0, 25, 50, 75, 100, 125, 150].map((num, i) => {
          const angle = -90 + (i / 6) * 180;
          const rad = (angle * Math.PI) / 180;
          const x = centerX + Math.cos(rad) * (radius - 50);
          const y = centerY + Math.sin(rad) * (radius - 50);
          
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              dy="0.3em"
              fontSize="14"
              fontWeight="bold"
              fill="hsl(var(--muted-foreground))"
              fontFamily="monospace"
            >
              {num}
            </text>
          );
        })}

        {/* Needle */}
        <line
          ref={needleRef}
          x1={centerX}
          y1={centerY}
          x2={centerX}
          y2={centerY - (radius - 40)}
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: 'none' }}
        />

        {/* Needle center circle */}
        <circle cx={centerX} cy={centerY} r="8" fill="hsl(var(--primary))" />
        <circle cx={centerX} cy={centerY} r="5" fill="hsl(var(--background))" />
      </svg>

      <div className="text-center space-y-1">
        <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {deviceName}
        </div>
        <div className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary via-tech-cyan to-primary">
          {maxPower} кВт
        </div>
      </div>
    </div>
  );
}
