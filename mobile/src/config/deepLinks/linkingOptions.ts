import { Linking } from "react-native";
import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "../../types";
import { DEEP_LINK_CONFIG, DEEP_LINK_PREFIXES } from "./routes";

// ─── Full linking options object ──────────────────────────────────────────────

/**
 * Pass this directly to <NavigationContainer linking={...} />.
 *
 * Example:
 *   import { LINKING_OPTIONS } from '../config/DeepLinkConfig';
 *   <NavigationContainer linking={LINKING_OPTIONS} ...>
 */
export const LINKING_OPTIONS: LinkingOptions<RootStackParamList> = {
  prefixes: [...DEEP_LINK_PREFIXES],
  config: DEEP_LINK_CONFIG,

  /**
   * Custom getInitialURL — handles cold-start deep links.
   * Falls back to Linking.getInitialURL() which covers both
   * custom schemes and universal links.
   */
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return url ?? undefined;
  },

  /**
   * Custom subscribe — handles warm/hot-start deep links.
   * Returns an unsubscribe function as required by react-navigation.
   */
  subscribe(listener) {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      listener(url);
    });
    return () => subscription.remove();
  },
};
