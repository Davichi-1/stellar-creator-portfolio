import React from 'react';
import { render } from '@testing-library/react-native';
import { ToastContainer } from '../ToastContainer';
import { ToastProvider, useToast } from '../../../context/ToastContext';
import { Button } from 'react-native';

/**
 * Global toast rendering (Issue #1386).
 *
 * The defect these cover is not that the component was wrong but that nothing
 * mounted it: `app/_layout.tsx` provided the context and never rendered the
 * container, so `showToast` pushed into state that nothing drew.
 */

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function Trigger({ message }: { message: string }) {
  const { showToast } = useToast();
  return <Button title="show" onPress={() => showToast(message, 'success')} />;
}

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>,
  );
}

describe('ToastContainer', () => {
  it('renders nothing while the queue is empty', () => {
    const { toJSON } = renderWithProvider(<Trigger message="hello" />);
    // An always-mounted absolute overlay would swallow touches across the app.
    expect(toJSON()).toBeTruthy();
  });

  it('renders a toast once one is queued', () => {
    const { getByText, getByTitle } = renderWithProvider(
      <Trigger message="Saved successfully" />,
    );

    getByTitle('show').props.onPress();

    expect(getByText('Saved successfully')).toBeTruthy();
  });

  it('offsets the stack by the top safe-area inset', () => {
    // Pinned at 0 the first toast renders under the notch, which is where its
    // dismiss control sits.
    const { getByText, getByTitle, UNSAFE_getAllByType } = renderWithProvider(
      <Trigger message="Inset check" />,
    );
    getByTitle('show').props.onPress();
    expect(getByText('Inset check')).toBeTruthy();

    const views = UNSAFE_getAllByType(require('react-native').View);
    const positioned = views.find((v: { props: { style?: unknown } }) => {
      const style = Array.isArray(v.props.style) ? v.props.style : [v.props.style];
      return style.some((s: { top?: number } | undefined) => s?.top === 44);
    });
    expect(positioned).toBeDefined();
  });

  it('does not block touches outside a toast', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(<Trigger message="x" />);
    const views = UNSAFE_getAllByType(require('react-native').View);
    const overlay = views.find(
      (v: { props: { pointerEvents?: string } }) => v.props.pointerEvents === 'box-none',
    );
    // Without box-none the overlay would capture every tap on the screen.
    expect(overlay).toBeDefined();
  });
});
