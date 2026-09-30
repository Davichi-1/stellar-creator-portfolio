import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata = {
  title: "Onboarding | Tamgora Creators",
  description: "Complete your profile setup",
};

/** Onboarding route — renders the multi-step `OnboardingWizard` for a new user's profile setup. */
export default function OnboardingPage() {
  return <OnboardingWizard />;
}
