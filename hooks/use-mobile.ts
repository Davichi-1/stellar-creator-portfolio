import * as React from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Reports whether the viewport is narrower than the mobile breakpoint (768px).
 *
 * Subscribes to a `matchMedia` query so the value updates when the window is
 * resized across the breakpoint. Returns `false` during SSR and the first
 * client render, before the effect has measured the window.
 *
 * @returns `true` if `window.innerWidth` is below 768px, otherwise `false`.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}
