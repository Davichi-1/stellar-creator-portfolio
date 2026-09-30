'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TourTooltip } from '@/components/TourTooltip';

interface TourOverlayProps {
  /** Whether the tour step is currently visible. */
  isOpen: boolean;
  /** CSS selector for the element to spotlight (resolved via `document.querySelector`). */
  targetSelector: string;
  /** Heading shown in the tooltip for this step. */
  title: string;
  /** Body text shown in the tooltip for this step. */
  description: string;
  /** Current step number, passed through to the tooltip's progress indicator. */
  step: number;
  /** Total number of steps in the tour. */
  totalSteps: number;
  /** Advance to the next step. */
  onNext: () => void;
  /** Return to the previous step. */
  onPrevious: () => void;
  /** Dismiss the tour; also fired when the backdrop is clicked. */
  onSkip: () => void;
  /** Finish the tour from the final step. */
  onComplete: () => void;
}

/**
 * Renders a single step of a guided product tour.
 *
 * When `isOpen` is true, portals into `document.body`:
 * - a dimmed backdrop that calls `onSkip` when clicked,
 * - a spotlight cut-out around the element matched by `targetSelector`,
 *   re-measured on window resize and scroll so it follows the target,
 * - a {@link TourTooltip} with the step's content and navigation callbacks.
 *
 * Renders nothing until mounted on the client (so it is SSR-safe) or while
 * `isOpen` is false. If no element matches `targetSelector`, a warning is
 * logged and the tooltip is shown without a spotlight.
 *
 * The component is stateless with respect to tour progress: the parent owns
 * `step` and decides what `onNext` / `onPrevious` / `onSkip` / `onComplete` do.
 */
export function TourOverlay({
  isOpen,
  targetSelector,
  title,
  description,
  step,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(targetSelector);
    if (!element) {
      console.warn(`Tour target not found: ${targetSelector}`);
      return;
    }

    const rect = element.getBoundingClientRect();
    setTargetRect(rect);

    const handleResize = () => {
      const newRect = element.getBoundingClientRect();
      setTargetRect(newRect);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isOpen, targetSelector]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="tour-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 z-40 pointer-events-auto"
            onClick={onSkip}
          />

          {/* Spotlight */}
          {targetRect && (
            <motion.div
              key="tour-spotlight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed z-40 pointer-events-none"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                borderRadius: 'var(--radius, 8px)',
              }}
            />
          )}

          {/* Tooltip */}
          <div className="fixed z-50 pointer-events-none">
            <TourTooltip
              title={title}
              description={description}
              step={step}
              totalSteps={totalSteps}
              targetRect={targetRect}
              onNext={onNext}
              onPrevious={onPrevious}
              onSkip={onSkip}
              onComplete={onComplete}
            />
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
