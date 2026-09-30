import React from 'react';
// Accessibility utilities and helpers for WCAG compliance

export const A11Y_LABELS = {
  // Navigation
  toggleMenu: 'Toggle navigation menu',
  toggleTheme: 'Toggle dark/light theme',
  closeMenu: 'Close navigation menu',

  // Forms
  search: 'Search creators and bounties',
  filterBy: 'Filter results',
  submit: 'Submit form',

  // Interactive
  viewProfile: 'View creator profile',
  applyBounty: 'Apply for this bounty',
  leaveReview: 'Leave a review',
  readMore: 'Read more',

  // Status
  loading: 'Loading...',
  error: 'Error occurred',
  success: 'Success',
};

/**
 * Returns a keydown handler for arrow-key/enter navigation between sibling
 * DOM elements (e.g. a listbox or toolbar). Arrow keys move focus to the
 * next/previous sibling of `document.activeElement`; Enter/Space calls
 * `onSelect` with the currently focused element. `items` is accepted for
 * API clarity but the handler navigates via DOM siblings, not the array.
 */
export function useKeyboardNavigation(
  items: HTMLElement[],
  onSelect?: (item: HTMLElement) => void
) {
  return (event: React.KeyboardEvent) => {
    const { key } = event;

    if (key === 'ArrowDown' || key === 'ArrowRight') {
      event.preventDefault();
      const next = document.activeElement?.nextElementSibling as HTMLElement;
      next?.focus();
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      event.preventDefault();
      const prev = document.activeElement?.previousElementSibling as HTMLElement;
      prev?.focus();
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      onSelect?.(document.activeElement as HTMLElement);
    }
  };
}

/**
 * Traps Tab/Shift+Tab focus cycling within `elementRef`'s subtree (e.g. for a
 * modal dialog): tabbing past the last focusable element wraps to the first,
 * and Shift+Tab on the first wraps to the last.
 */
export function useFocusTrap(elementRef: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [elementRef]);
}

/** Visually-hidden-until-focused link that jumps keyboard users past navigation to `#main-content`. */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="absolute -top-14 left-0 bg-primary text-primary-foreground px-4 py-2 rounded focus:top-0 transition-all z-50"
    >
      Skip to main content
    </a>
  );
}

/**
 * Visually-hidden `aria-live` region that announces `message` to screen
 * readers without disrupting sighted layout. Use `role="alert"` for urgent,
 * interrupting announcements; the default `"status"` is polite and waits for
 * the screen reader to finish its current utterance.
 */
export function LiveRegion({ message, role = 'status' }: { message: string; role?: 'status' | 'alert' }) {
  return (
    <div
      role={role}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/** Static helpers for ad-hoc, in-browser accessibility auditing of a DOM subtree. */
export class AccessibilityChecker {
  /**
   * Placeholder contrast check — always returns `true`. Computing real WCAG
   * contrast ratios needs parsed RGB values and relative-luminance math; use
   * a dedicated library (e.g. `color-contrast-checker`) for accurate results.
   */
  static checkContrast(element: HTMLElement): boolean {
    const computed = window.getComputedStyle(element);
    const color = computed.color;
    const backgroundColor = computed.backgroundColor;

    // Simplified check - in production use a proper contrast checking library
    return true;
  }

  /**
   * Scans `container` for focusable elements and flags two common issues:
   * interactive elements with neither an `aria-label` nor visible text, and
   * `role="button"` elements missing the `aria-pressed`/`aria-expanded`
   * state screen readers need to announce.
   */
  static checkKeyboardNavigation(container: HTMLElement): {
    focusableElements: HTMLElement[];
    missingLabels: HTMLElement[];
    missingAria: HTMLElement[];
  } {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea'
    ) as NodeListOf<HTMLElement>;

    const missingLabels = Array.from(focusableElements).filter(
      (el) => !el.getAttribute('aria-label') && !el.textContent?.trim()
    );

    const missingAria = Array.from(focusableElements).filter(
      (el) =>
        el.getAttribute('role') === 'button' &&
        !el.hasAttribute('aria-pressed') &&
        !el.hasAttribute('aria-expanded')
    );

    return {
      focusableElements: Array.from(focusableElements),
      missingLabels,
      missingAria,
    };
  }

  /**
   * Produces a rough accessibility score (100 minus 20 per issue, 5 per
   * warning, floored at 0) for `container` by checking for a heading
   * structure, images missing `alt` text, and (via `checkContrast`, currently
   * a placeholder) color contrast.
   */
  static generateAccessibilityReport(container: HTMLElement): {
    score: number;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check headings structure
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push('No headings found on page');
    }

    // Check for images without alt text
    const images = container.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      issues.push(`${images.length} images missing alt text`);
    }

    // Check color contrast
    const elements = container.querySelectorAll('*');
    elements.forEach((el) => {
      if (!this.checkContrast(el as HTMLElement)) {
        warnings.push('Potential contrast issue');
      }
    });

    // Calculate score
    const score = Math.max(0, 100 - issues.length * 20 - warnings.length * 5);

    return { score, issues, warnings };
  }
}
