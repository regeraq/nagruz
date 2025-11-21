import { useEffect, useRef } from 'react';

interface PowerGaugeProps {
  maxPower: number;
  deviceName: string;
}

export function PowerGauge({ maxPower, deviceName }: PowerGaugeProps) {
  const centerX = 200;
  const centerY = 180;
  const radius = 130;
  
  const needleRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!needleRef.current) return;

    // Animate needle from 0 to current power
    // 0 kW = -90 deg (left), 150 kW = 90 deg (right)
    let currentAngle = -90;
    const targetAngle = -90 + (maxPower / 150) * 180;
    const steps = 60;
    let step = 0;

    const animate = () => {
      step++;
      const progress = step / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const angle = currentAngle + (targetAngle - currentAngle) * easeProgress;
      
      const needle = needleRef.current;
      if (needle) {
        needle.setAttribute('transform', `rotate(${angle} ${centerX} ${centerY})`);
      }

      if (step < steps) {
        requestAnimationFrame(animate);
      }
    };

    const timer = setTimeout(() => {
      animate();
    }, 300);

    return () => clearTimeout(timer);
  }, [maxPower, centerX, centerY]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl shadow-2xl shadow-primary/30 hover:border-primary/50 hover:shadow-primary/50 transition-all duration-500 group max-w-2xl">
      <svg
        width="400"
        height="360"
        viewBox="0 0 400 360"
        className="drop-shadow-2xl drop-shadow-primary/50"
      >
        {/* Background circle */}
        <circle cx={centerX} cy={centerY} r={radius} fill="rgba(26, 148, 255, 0.05)" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.3" />

        {/* Gradient ring */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--tech-cyan))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <circle cx={centerX} cy={centerY} r={radius - 5} fill="none" stroke="url(#gaugeGradient)" strokeWidth="8" />

        {/* Major tick marks */}
        {[...Array(7)].map((_, i) => {
          const angle = -90 + (i / 6) * 180;
          const rad = (angle * Math.PI) / 180;
          const x1 = centerX + Math.cos(rad) * (radius - 8);
          const y1 = centerY + Math.sin(rad) * (radius - 8);
          const x2 = centerX + Math.cos(rad) * (radius - 28);
          const y2 = centerY + Math.sin(rad) * (radius - 28);
          
          return (
            <line
              key={`tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              opacity="0.8"
              strokeLinecap="round"
            />
          );
        })}

        {/* Minor tick marks */}
        {[...Array(31)].map((_, i) => {
          if (i % 5 === 0) return null;
          const angle = -90 + (i / 30) * 180;
          const rad = (angle * Math.PI) / 180;
          const x1 = centerX + Math.cos(rad) * (radius - 10);
          const y1 = centerY + Math.sin(rad) * (radius - 10);
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
              strokeWidth="1.5"
              opacity="0.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Scale numbers */}
        {[0, 25, 50, 75, 100, 125, 150].map((num, i) => {
          const angle = -90 + (i / 6) * 180;
          const rad = (angle * Math.PI) / 180;
          const x = centerX + Math.cos(rad) * (radius - 55);
          const y = centerY + Math.sin(rad) * (radius - 55);
          
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              dy="0.4em"
              fontSize="18"
              fontWeight="700"
              fill="hsl(var(--primary))"
              fontFamily="'IBM Plex Mono', monospace"
              opacity="0.9"
              letterSpacing="1"
            >
              {num}
            </text>
          );
        })}

        {/* Needle glow */}
        <g ref={needleRef}>
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - (radius - 45)}
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.2"
          />
          
          {/* Needle */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - (radius - 45)}
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* Needle center circle glow */}
        <circle cx={centerX} cy={centerY} r="12" fill="hsl(var(--primary))" opacity="0.2" />

        {/* Needle center circle */}
        <circle cx={centerX} cy={centerY} r="8" fill="hsl(var(--primary))" />
        <circle cx={centerX} cy={centerY} r="4" fill="hsl(var(--background))" />
      </svg>

      <div className="text-center space-y-2">
        <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {deviceName}
        </div>
        <div className="text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary via-tech-cyan to-primary animate-gradient-shift">
          {maxPower} кВт
        </div>
      </div>
    </div>
  );
}
