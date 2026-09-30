'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  label: string;
  suffix?: string;
}

/**
 * Displays a number that counts up from 0 to `value`, with a label beneath it.
 *
 * The animation starts the first time at least 10% of the component scrolls
 * into view and runs once over 2 seconds with an ease-out curve. Intermediate
 * values are floored to integers.
 *
 * @param value - Final number to count up to.
 * @param label - Caption rendered below the number.
 * @param suffix - Optional text appended to the number (e.g. `"+"` or `"%"`).
 */
export function AnimatedCounter({ value, label, suffix = '' }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();
          const duration = 2000; // 2 seconds

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuad = 1 - (1 - progress) * (1 - progress);
            setDisplayValue(Math.floor(easeOutQuad * value));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
        {displayValue}
        {suffix}
      </div>
      <p className="text-sm sm:text-base text-muted-foreground">{label}</p>
    </div>
  );
}
