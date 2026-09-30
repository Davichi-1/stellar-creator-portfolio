'use client';

import React from 'react';

/**
 * Props for configuring the {@link EnhancedCard} component.
 */
export interface EnhancedCardProps {
  /**
   * Content to render inside the card container.
   */
  children: React.ReactNode;
  /**
   * When true, the card styles and accessibility attributes adapt to indicate
   * an interactive clickable surface (pointer cursor, hover elevation, role="button", tabIndex=0).
   * @default false
   */
  clickable?: boolean;
  /**
   * Callback invoked when the card is clicked or triggered via keyboard navigation (Enter or Space key).
   */
  onClick?: () => void;
  /**
   * Optional additional CSS classes to append to the card container.
   * @default ''
   */
  className?: string;
  /**
   * When true, applies hover animations and Tailwind `group` utilities for nested styling transitions.
   * @default true
   */
  animated?: boolean;
}

/**
 * An enhanced card container component with built-in styling, transition animations,
 * and keyboard accessibility for interactive surfaces.
 *
 * When `clickable` is enabled:
 * - Applies cursor pointer and hover elevation (`hover:shadow-lg hover:-translate-y-1`).
 * - Assigns `role="button"` and `tabIndex={0}` for screen reader and keyboard accessibility.
 * - Listens for `Enter` and `Space` key presses to trigger `onClick`.
 *
 * @example
 * ```tsx
 * <EnhancedCard clickable onClick={() => console.log('Card selected')}>
 *   <h3>Project Title</h3>
 *   <p>Project details and metrics.</p>
 * </EnhancedCard>
 * ```
 *
 * @param props - Configuration properties for the card.
 * @returns An accessible styled card element.
 */
export function EnhancedCard({
  children,
  clickable = false,
  onClick,
  className = '',
  animated = true,
}: EnhancedCardProps) {
  const baseStyles =
    'bg-card border border-border rounded-lg overflow-hidden transition-all duration-300';

  const interactiveStyles = clickable
    ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1'
    : '';

  const animationStyles = animated ? 'group' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${interactiveStyles} ${animationStyles} ${className}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          onClick?.();
        }
      }}
    >
      {children}
    </div>
  );
}
