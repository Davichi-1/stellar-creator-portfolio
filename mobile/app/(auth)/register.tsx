import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { RegisterScreen } from '../../src/screens/RegisterScreen';
import { ROUTES } from '../../src/constants/routes';
import type { DisciplineFields, ProfileFields } from '../../src/hooks/useRegisterForm';

/**
 * Introductory registration route (`/(auth)/register`).
 *
 * Collects profile, discipline, and an optional Stellar address, then returns
 * the user to login so wallet ownership is proved on the WalletConnect gateway.
 */
export default function RegisterRoute() {
  const router = useRouter();

  const handleComplete = useCallback(
    (_profile: ProfileFields, _discipline: DisciplineFields, _publicKey: string) => {
      router.replace(ROUTES.AUTH.LOGIN);
    },
    [router],
  );

  const handleSignIn = useCallback(() => {
    router.replace(ROUTES.AUTH.LOGIN);
  }, [router]);

  return <RegisterScreen onComplete={handleComplete} onSignIn={handleSignIn} />;
}
