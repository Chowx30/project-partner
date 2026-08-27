import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import type { ProfileRecord } from "@/src/lib/profile/data";
import { isDepartment } from "@/src/lib/profile/validation";
import { createClient } from "@/src/lib/supabase/server";

export async function requireCompletedProfile(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;
  profile: ProfileRecord;
}> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [profileResult, verificationResult, courseResult, skillResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, department, bio, graduation_year")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("student_verifications")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_courses")
        .select("course_id")
        .eq("user_id", user.id)
        .limit(1),
      supabase
        .from("user_skills")
        .select("skill_id")
        .eq("user_id", user.id)
        .limit(1),
    ]);

  if (
    profileResult.error ||
    verificationResult.error ||
    courseResult.error ||
    skillResult.error
  ) {
    throw new Error("Unable to load profile data.");
  }

  const profile = profileResult.data as ProfileRecord | null;
  const isComplete = Boolean(
    profile &&
      profile.full_name.length > 0 &&
      isDepartment(profile.department) &&
      profile.graduation_year !== null &&
      verificationResult.data &&
      courseResult.data.length > 0 &&
      skillResult.data.length > 0,
  );

  if (!isComplete || !profile) {
    redirect("/onboarding");
  }

  return {
    user,
    profile,
  };
}
