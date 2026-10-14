import React, { useEffect, useState } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
}

export function CountUp({ value, duration = 800, isCurrency = false }: CountUpProps) {
  const [current, setCurrent] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Subtle smooth ease-out curve (no bouncing)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCurrent(value);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  const safeCurrent = typeof current === 'number' && !isNaN(current) ? current : 0;

  if (isCurrency) {
    return (
      <span className="tabular-nums">
        {new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0
        }).format(safeCurrent)}
      </span>
    );
  }

  return (
    <span className="tabular-nums">
      {new Intl.NumberFormat('en-IN').format(safeCurrent)}
    </span>
  );
}
