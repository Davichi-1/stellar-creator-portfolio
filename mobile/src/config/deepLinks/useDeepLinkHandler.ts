import { useEffect } from "react";
import { Linking } from "react-native";
import { parseDeepLink, type DeepLinkRoute } from "./parser";

// ─── Deep-link handler hook ───────────────────────────────────────────────────

/**
 * useDeepLinkHandler — subscribes to incoming deep links and calls
 * the provided handler with a parsed DeepLinkRoute.
 *
 * Usage:
 *   useDeepLinkHandler((route) => {
 *     if (route.screen === 'CreatorProfile') {
 *       navigation.navigate('CreatorProfile', route.params);
 *     }
 *   });
 */
export function useDeepLinkHandler(
  handler: (route: DeepLinkRoute) => void,
): void {
  useEffect(() => {
    // Handle cold-start URL
    Linking.getInitialURL().then((url) => {
      if (url) handler(parseDeepLink(url));
    });

    // Handle warm/hot-start URLs
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handler(parseDeepLink(url));
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
