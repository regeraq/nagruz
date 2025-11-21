import { useEffect, useRef } from "react";

interface PowerGaugeProps {
  maxPower: number;
}

export function PowerGauge({ maxPower }: PowerGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const needleAngleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = "hsl(var(--card))";
      ctx.fillRect(0, 0, width, height);

      // Draw gauge background
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = "hsl(var(--card-border))";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw gauge segments with glow
      const segments = 10;
      for (let i = 0; i <= segments; i++) {
        const angle = Math.PI + (Math.PI * i) / segments;
        const x1 = centerX + Math.cos(angle) * (radius - 15);
        const y1 = centerY + Math.sin(angle) * (radius - 15);
        const x2 = centerX + Math.cos(angle) * radius;
        const y2 = centerY + Math.sin(angle) * radius;

        // Color gradient based on position
        const hue = 200 + (i / segments) * 50;
        ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
      ctx.fillStyle = "hsl(var(--primary))";
      ctx.fill();
      ctx.strokeStyle = "hsl(var(--card))";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Animate needle
      needleAngleRef.current += 0.02;
      if (needleAngleRef.current > 1) {
        needleAngleRef.current = 0;
      }

      const needleAngle = Math.PI + needleAngleRef.current * Math.PI;
      const needleLength = radius - 10;
      const needleX = centerX + Math.cos(needleAngle) * needleLength;
      const needleY = centerY + Math.sin(needleAngle) * needleLength;

      // Draw needle with glow
      ctx.shadowColor = "hsl(var(--primary) / 0.6)";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(needleX, needleY);
      ctx.stroke();
      ctx.shadowColor = "transparent";

      // Draw labels
      ctx.fillStyle = "hsl(var(--foreground))";
      ctx.font = "14px IBM Plex Sans";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const labels = ["0", `${Math.round(maxPower / 2)}`, `${maxPower}`];
      for (let i = 0; i < labels.length; i++) {
        const angle = Math.PI + (Math.PI * i) / 2;
        const x = centerX + Math.cos(angle) * (radius + 30);
        const y = centerY + Math.sin(angle) * (radius + 30);
        ctx.fillText(labels[i], x, y);
      }

      // Draw kW label
      ctx.font = "bold 16px IBM Plex Sans";
      ctx.fillText("кВт", centerX, centerY + radius + 60);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [maxPower]);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        className="rounded-lg border border-card-border bg-card/50 animate-fade-up"
        style={{ animationDelay: "0.3s" }}
      />
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">Максимальная мощность</p>
        <p className="text-2xl font-bold text-primary">{maxPower} кВт</p>
      </div>
    </div>
  );
}
