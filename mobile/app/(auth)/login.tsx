import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AuthFlowNavigator } from '../../src/screens/AuthFlowNavigator';
import { ROUTES } from '../../src/constants/routes';

export default function LoginRoute() {
  const router = useRouter();

  // NOTE: intentionally not calling useAuthStore().setUser() here. Doing so
  // needs a persisted User record the rest of the app can restore. WalletConnect
  // stores its own session; this route only moves the current session into the
  // app. A restart returns to login unless that session is still valid.
  const handleAuthComplete = useCallback(
    (_publicKey: string) => {
      router.replace(ROUTES.APP.HOME);
    },
    [router],
  );

  return <AuthFlowNavigator onAuthComplete={handleAuthComplete} />;
}
