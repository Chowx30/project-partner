import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  getOnboardingSnapshot,
  type OnboardingSnapshot,
  type ProfileRecord,
} from "@/src/lib/profile/data";

type CompletedOnboardingSnapshot = OnboardingSnapshot & {
  profile: ProfileRecord;
};

export async function requireCompletedProfile(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;
  snapshot: CompletedOnboardingSnapshot;
}> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const snapshot = await getOnboardingSnapshot(user.id);

  if (!snapshot.isComplete || !snapshot.profile) {
    redirect("/onboarding");
  }

  return {
    user,
    snapshot: snapshot as CompletedOnboardingSnapshot,
  };
}
