import { DEEP_LINK_PREFIXES } from "./routes";

// ─── Parsed deep-link type ────────────────────────────────────────────────────

export type DeepLinkRoute =
  | { screen: "Home" }
  | { screen: "Dashboard"; params?: { period?: string } }
  | { screen: "CreatorProfile"; params: { creatorId: string } }
  | { screen: "FreelancerDirectory" }
  | { screen: "FreelancerProfile"; params: { creatorId: string } }
  | { screen: "Messaging"; params: { conversationId: string } }
  | { screen: "ImagePicker" }
  | { screen: "StreamHost"; params: { roomId: string } }
  | { screen: "StreamViewer"; params: { roomId: string } }
  | { screen: "LanguageSettings" }
  | { screen: "Unknown"; url: string };

// ─── URL parser ───────────────────────────────────────────────────────────────

/**
 * Parses a raw deep-link URL into a typed route descriptor.
 * Handles both custom scheme (stellar://) and universal links (https://stellar.app).
 *
 * @example
 *   parseDeepLink('stellar://creator/alex-studio')
 *   // → { screen: 'CreatorProfile', params: { creatorId: 'alex-studio' } }
 *
 *   parseDeepLink('https://stellar.app/freelancers')
 *   // → { screen: 'FreelancerDirectory' }
 */
export function parseDeepLink(url: string): DeepLinkRoute {
  // Normalise: strip scheme + host to get the path
  let path = url;

  for (const prefix of DEEP_LINK_PREFIXES) {
    if (url.startsWith(prefix)) {
      path = url.slice(prefix.length);
      break;
    }
  }

  // Strip leading slash and query string
  path = path.replace(/^\/+/, "").split("?")[0].split("#")[0];

  const segments = path.split("/").filter(Boolean);
  const [first, second] = segments;

  switch (first) {
    case undefined:
    case "":
      return { screen: "Home" };

    case "dashboard":
      return {
        screen: "Dashboard",
        params: second ? { period: second } : undefined,
      };

    case "creator":
      if (second)
        return { screen: "CreatorProfile", params: { creatorId: second } };
      return { screen: "FreelancerDirectory" };

    case "freelancers":
      if (second)
        return { screen: "FreelancerProfile", params: { creatorId: second } };
      return { screen: "FreelancerDirectory" };

    case "messages":
      if (second)
        return { screen: "Messaging", params: { conversationId: second } };
      return { screen: "Home" };

    case "upload":
      return { screen: "ImagePicker" };

    case "stream":
      if (!second) return { screen: "Unknown", url };
      if (segments[2] === "host") {
        return { screen: "StreamHost", params: { roomId: second } };
      }
      return { screen: "StreamViewer", params: { roomId: second } };

    case "settings":
      if (second === "language") return { screen: "LanguageSettings" };
      return { screen: "Home" };

    case "profile":
    case "activity":
    case "home":
      return { screen: "Home" };

    default:
      return { screen: "Unknown", url };
  }
}
