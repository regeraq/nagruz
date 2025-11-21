import { useEffect, useRef } from "react";

interface PowerGaugeProps {
  maxPower: number;
}

export function PowerGauge({ maxPower }: PowerGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const needleAngleRef = useRef(0);
  const targetAngleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 280;
    const height = 200;
    const centerX = width / 2;
    const centerY = height * 0.75;
    const radius = 100;

    // Calculate target angle (from -90 to 90 degrees for half circle)
    const targetAngle = (-90 + (maxPower / (maxPower * 2)) * 180) * (Math.PI / 180);
    targetAngleRef.current = targetAngle;

    const drawGauge = (needleAngle: number) => {
      // Clear canvas with gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "hsl(210, 42%, 98%)");
      bgGradient.addColorStop(1, "hsl(210, 42%, 96%)");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw outer circle shadow
      ctx.shadowColor = "rgba(26, 148, 255, 0.2)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;

      // Draw gauge circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(26, 148, 255, 0.3)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.shadowColor = "transparent";

      // Draw gauge arc background
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 8, (-90 * Math.PI) / 180, (90 * Math.PI) / 180);
      ctx.strokeStyle = "rgba(200, 200, 200, 0.4)";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw colored arc (0 to max)
      const arcGradient = ctx.createConicGradient((-90 * Math.PI) / 180, centerX, centerY);
      arcGradient.addColorStop(0, "hsl(142, 72%, 42%)"); // Green
      arcGradient.addColorStop(0.7, "hsl(43, 88%, 58%)"); // Yellow
      arcGradient.addColorStop(1, "hsl(0, 84%, 52%)"); // Red

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 8, (-90 * Math.PI) / 180, needleAngle);
      ctx.strokeStyle = arcGradient;
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw tick marks
      for (let i = 0; i <= 10; i++) {
        const angle = (-90 + (i / 10) * 180) * (Math.PI / 180);
        const isMainTick = i % 2 === 0;
        const tickLength = isMainTick ? 16 : 8;

        const x1 = centerX + Math.cos(angle) * (radius - 3);
        const y1 = centerY + Math.sin(angle) * (radius - 3);
        const x2 = centerX + Math.cos(angle) * (radius - 3 - tickLength);
        const y2 = centerY + Math.sin(angle) * (radius - 3 - tickLength);

        ctx.strokeStyle = isMainTick ? "rgba(26, 30, 44, 0.8)" : "rgba(26, 30, 44, 0.4)";
        ctx.lineWidth = isMainTick ? 2 : 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw numbers
        if (isMainTick) {
          const numX = centerX + Math.cos(angle) * (radius - 35);
          const numY = centerY + Math.sin(angle) * (radius - 35);
          ctx.fillStyle = "rgba(26, 30, 44, 0.7)";
          ctx.font = "bold 13px IBM Plex Mono";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(Math.round((i / 10) * maxPower)), numX, numY);
        }
      }

      // Draw needle shadow
      ctx.shadowColor = "rgba(26, 148, 255, 0.4)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(26, 148, 255, 0.3)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngle) * (radius - 20),
        centerY + Math.sin(needleAngle) * (radius - 20)
      );
      ctx.stroke();

      ctx.shadowColor = "transparent";

      // Draw needle
      ctx.strokeStyle = "hsl(210, 100%, 52%)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngle) * (radius - 20),
        centerY + Math.sin(needleAngle) * (radius - 20)
      );
      ctx.stroke();

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
      ctx.fillStyle = "hsl(210, 100%, 52%)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "hsl(210, 42%, 98%)";
      ctx.fill();

      // Draw kW label
      ctx.fillStyle = "rgba(100, 100, 100, 0.8)";
      ctx.font = "12px IBM Plex Sans";
      ctx.textAlign = "center";
      ctx.fillText("кВт", centerX, centerY + radius + 30);
    };

    const animate = () => {
      // Smooth animation towards target angle
      const angleDiff = targetAngleRef.current - needleAngleRef.current;
      if (Math.abs(angleDiff) > 0.01) {
        needleAngleRef.current += angleDiff * 0.1;
      } else {
        needleAngleRef.current = targetAngleRef.current;
      }

      drawGauge(needleAngleRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    canvas.width = width;
    canvas.height = height;
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
        className="rounded-lg drop-shadow-lg hover:drop-shadow-xl transition-all duration-300 animate-fade-up"
        style={{ animationDelay: "0.3s" }}
      />
    </div>
  );
}
