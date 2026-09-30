/**
 * Static tests for the typed route constants.
 *
 * Verifies the shape and values of `ROUTES` so accidental renames or typos in
 * navigation targets are caught without an emulator.
 */
import { ROUTES, type AppRoute } from '../constants/routes';

describe('ROUTES', () => {
  it('exposes the expected route groups', () => {
    expect(Object.keys(ROUTES).sort()).toEqual(['APP', 'AUTH']);
  });

  it('declares the expected auth routes', () => {
    expect(Object.keys(ROUTES.AUTH).sort()).toEqual(['LOGIN', 'ONBOARDING']);
    expect(ROUTES.AUTH.LOGIN).toBe('/(auth)/login');
    expect(ROUTES.AUTH.ONBOARDING).toBe('/(auth)/onboarding');
  });

  it('declares the expected app routes', () => {
    expect(Object.keys(ROUTES.APP).sort()).toEqual(['AUDIO', 'BIOMETRIC', 'HOME', 'MULTISIG', 'P2P', 'PREFERENCES']);
    expect(ROUTES.APP.HOME).toBe('/(app)/home');
    expect(ROUTES.APP.AUDIO).toBe('/(app)/audio');
    expect(ROUTES.APP.MULTISIG).toBe('/(app)/multisig');
    expect(ROUTES.APP.P2P).toBe('/(app)/p2p');
    expect(ROUTES.APP.BIOMETRIC).toBe('/(app)/biometric-auth');
    expect(ROUTES.APP.PREFERENCES).toBe('/(app)/preferences');
  });

  it('uses absolute, route-group-prefixed paths for every route', () => {
    const allRoutes: AppRoute[] = [
      ROUTES.AUTH.LOGIN,
      ROUTES.AUTH.ONBOARDING,
      ROUTES.APP.HOME,
      ROUTES.APP.AUDIO,
      ROUTES.APP.MULTISIG,
      ROUTES.APP.P2P,
      ROUTES.APP.BIOMETRIC,
      ROUTES.APP.PREFERENCES,
    ];
    for (const route of allRoutes) {
      expect(route).toMatch(/^\/\((auth|app)\)\//);
    }
  });

  it('does not contain duplicate route strings', () => {
    const allRoutes = [
      ROUTES.AUTH.LOGIN,
      ROUTES.AUTH.ONBOARDING,
      ROUTES.APP.HOME,
      ROUTES.APP.AUDIO,
      ROUTES.APP.MULTISIG,
      ROUTES.APP.P2P,
      ROUTES.APP.BIOMETRIC,
      ROUTES.APP.PREFERENCES,
    ];
    expect(new Set(allRoutes).size).toBe(allRoutes.length);
  });
});
