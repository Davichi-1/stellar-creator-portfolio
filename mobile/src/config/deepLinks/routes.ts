import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "../../types";

// ─── URL prefixes ─────────────────────────────────────────────────────────────

export const DEEP_LINK_PREFIXES = [
  "stellar://",
  "https://stellar.app",
  "https://www.stellar.app",
] as const;

// ─── Route path map ───────────────────────────────────────────────────────────

/**
 * Maps react-navigation screen names to URL path patterns.
 * Nested navigators use the dot notation: "MainTabs/Profile".
 */
export const DEEP_LINK_CONFIG: LinkingOptions<RootStackParamList>["config"] = {
  screens: {
    MainTabs: {
      screens: {
        Home: "",
        Dashboard: "dashboard",
        Profile: "profile",
        Activity: "activity",
        Settings: "settings",
      },
    },
    Dashboard: "dashboard/:period?",
    LanguageSettings: "settings/language",
    // Extended screens (added by issues #542–#545)
    CreatorProfile: "creator/:creatorId",
    FreelancerDirectory: "freelancers",
    FreelancerProfile: "freelancers/:creatorId",
    Messaging: "messages/:conversationId",
    ImagePicker: "upload",
    StreamHost: "stream/:roomId/host",
    StreamViewer: "stream/:roomId",
  } as any, // cast needed until extended param list is added
};
