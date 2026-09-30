/**
 * Apple Touch Icon route handler.
 * Generates an optimized 180x180 PNG touch icon for Apple devices using Next.js ImageResponse.
 *
 * Accessibility Audit:
 * - The root element includes `role="img"` and `aria-label="Application Icon"` to ensure
 *   semantic accessibility when rendered or evaluated in automated DOM/A11y scanners.
 * - This route serves as a static image response asset and does not contain interactive controls.
 */

import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        role="img"
        aria-label="Application Icon"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#6166F1',
          borderRadius: 40,
        }}
      >
        <div style={{ display: 'flex', position: 'absolute', left: 44, top: 49, width: 92, height: 23, background: '#ffffff', borderRadius: 11.5 }} />
        <div style={{ display: 'flex', position: 'absolute', left: 78.5, top: 49, width: 23, height: 82, background: '#ffffff', borderRadius: 11.5 }} />
      </div>
    ),
    { ...size }
  );
}
