import { useEffect, useRef } from 'react';

interface PowerGaugeProps {
  maxPower: number;
  useEnhancedScale?: boolean;
}

export function PowerGauge({ maxPower, useEnhancedScale = false }: PowerGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const startAngle = -135; // Начальный угол стрелки
  const needleAngleRef = useRef<number>(startAngle);
  const hoverStepRef = useRef<number>(0);
  const isHoveringRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true);
  const loadStepRef = useRef<number>(0);
  const startAnimationRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Reset animation state on power change
    isInitialLoadRef.current = true;
    loadStepRef.current = 0;
    hoverStepRef.current = 0;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive canvas size
    const isMobile = window.innerWidth < 640;
    const size = isMobile ? 240 : 300;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 120;

    // Determine scale based on whether we use enhanced scale or fixed 150
    const scaleMax = useEnhancedScale 
      ? Math.ceil(maxPower / 50) * 50  // Dynamic: round up to nearest 50
      : 150;                             // Fixed: always 150 for NU-100 and NU-30
    
    // Calculate target angle for current power level
    const targetAngle = startAngle + (maxPower / scaleMax) * 270;
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

      // Draw scale marks and numbers
      for (let i = 0; i <= scaleMax; i += 10) {
        const scaleAngle = minAngle + ((i / scaleMax) * (maxAngle - minAngle));
        const isMainTick = i % 50 === 0;
        const isMediumTick = i % 50 !== 0 && i % 10 === 0;
        
        let tickLength: number;
        let tickWidth: number;
        let tickColor: string;

        if (isMainTick) {
          tickLength = useEnhancedScale ? 24 : 20;
          tickWidth = useEnhancedScale ? 3 : 2;
          tickColor = useEnhancedScale ? 'rgba(26, 148, 255, 1)' : 'rgba(26, 148, 255, 0.8)';
        } else if (isMediumTick) {
          tickLength = useEnhancedScale ? 14 : 10;
          tickWidth = useEnhancedScale ? 1.5 : 1;
          tickColor = useEnhancedScale ? 'rgba(26, 148, 255, 0.7)' : 'rgba(26, 148, 255, 0.5)';
        } else {
          continue;
        }

        const x1 = centerX + Math.cos(scaleAngle) * (radius - (useEnhancedScale ? 2 : 5));
        const y1 = centerY + Math.sin(scaleAngle) * (radius - (useEnhancedScale ? 2 : 5));
        const x2 = centerX + Math.cos(scaleAngle) * (radius - (useEnhancedScale ? 2 : 5) - tickLength);
        const y2 = centerY + Math.sin(scaleAngle) * (radius - (useEnhancedScale ? 2 : 5) - tickLength);

        ctx.strokeStyle = tickColor;
        ctx.lineWidth = tickWidth;
        ctx.lineCap = 'round';
        if (useEnhancedScale) {
          ctx.lineJoin = 'round';
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (isMainTick) {
          const numX = centerX + Math.cos(scaleAngle) * (radius - (useEnhancedScale ? 55 : 50));
          const numY = centerY + Math.sin(scaleAngle) * (radius - (useEnhancedScale ? 55 : 50));
          
          ctx.fillStyle = useEnhancedScale ? 'rgba(26, 148, 255, 0.9)' : 'rgba(26, 148, 255, 0.9)';
          ctx.font = useEnhancedScale ? 'bold 18px IBM Plex Mono' : 'bold 16px IBM Plex Mono';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (useEnhancedScale) {
            // Enhanced style with background
            const textMetrics = ctx.measureText(i.toString());
            ctx.fillStyle = 'rgba(10, 14, 39, 0.3)';
            ctx.fillRect(numX - textMetrics.width / 2 - 4, numY - 8, textMetrics.width + 8, 16);
            ctx.fillStyle = 'rgba(26, 148, 255, 1)';
          }
          
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

      // Анимация при наведении - запускается каждый раз заново от начального угла
      if (isHoveringRef.current) {
        if (hoverStepRef.current < totalSteps) {
          shouldContinue = true;
          const progress = hoverStepRef.current / totalSteps;
          // Анимация всегда от начального угла до целевого при каждом наведении
          angle = startAngle + (targetAngle - startAngle) * easeOutCubic(progress);
          hoverStepRef.current++;
          needleAngleRef.current = angle;
        } else {
          // Анимация завершена, стрелка на целевом значении
          needleAngleRef.current = targetAngle;
        }
      } 
      // Анимация при первой загрузке
      else if (isInitialLoadRef.current && loadStepRef.current < totalSteps) {
        shouldContinue = true;
        const progress = loadStepRef.current / totalSteps;
        angle = startAngle + (targetAngle - startAngle) * easeOutCubic(progress);
        needleAngleRef.current = angle;
        loadStepRef.current++;
      } else if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        needleAngleRef.current = targetAngle;
      }
      // Когда не наведено и не первая загрузка - возвращаем стрелку в начальное положение
      else {
        if (Math.abs(needleAngleRef.current - startAngle) > 0.1) {
          shouldContinue = true;
          angle = needleAngleRef.current + (startAngle - needleAngleRef.current) * 0.15;
          needleAngleRef.current = angle;
        } else {
          needleAngleRef.current = startAngle;
        }
      }

      drawGauge(angle);

      if (shouldContinue) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Функция для запуска/перезапуска анимации
    const startAnimation = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animate();
    };

    // Сохраняем функцию для использования в обработчиках событий
    startAnimationRef.current = startAnimation;

    // Запускаем анимацию
    startAnimation();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [maxPower, useEnhancedScale]);

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-primary/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl shadow-2xl shadow-primary/30 hover:border-primary/20 hover:shadow-primary/40 transition-all duration-700 group hover:scale-105 hover:shadow-primary/50 cursor-pointer w-full max-w-[280px] sm:max-w-[300px] mx-auto"
      onMouseEnter={() => {
        // Сбрасываем счетчик для перезапуска анимации каждый раз при наведении
        hoverStepRef.current = 0;
        isHoveringRef.current = true;
        // Возвращаем стрелку в начальное положение для новой анимации
        needleAngleRef.current = startAngle;
        // Перезапускаем анимацию через сохраненную функцию
        if (startAnimationRef.current) {
          startAnimationRef.current();
        }
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
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary via-tech-cyan to-primary animate-gradient-shift">
          {maxPower} кВт
        </div>
      </div>
    </div>
  );
}
