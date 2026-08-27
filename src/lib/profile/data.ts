import { createClient } from "@/src/lib/supabase/server";
import { isDepartment } from "@/src/lib/profile/validation";

export type CourseOption = {
  id: string;
  course_code: string;
  course_name: string;
};

export type SkillOption = {
  id: string;
  name: string;
};

export type ProfileRecord = {
  full_name: string;
  department: string;
  bio: string | null;
  graduation_year: number | null;
};

export type OnboardingSnapshot = {
  profile: ProfileRecord | null;
  studentId: string;
  studentIdVerifiedAt: string | null;
  courseIds: string[];
  skillIds: string[];
  isComplete: boolean;
};

export async function getOnboardingSnapshot(
  userId: string,
): Promise<OnboardingSnapshot> {
  const supabase = await createClient();
  const [profileResult, verificationResult, coursesResult, skillsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, department, bio, graduation_year")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("student_verifications")
        .select("student_id, verified_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_courses")
        .select("course_id")
        .eq("user_id", userId),
      supabase
        .from("user_skills")
        .select("skill_id")
        .eq("user_id", userId),
    ]);

  if (
    profileResult.error ||
    verificationResult.error ||
    coursesResult.error ||
    skillsResult.error
  ) {
    throw new Error("Unable to load profile data.");
  }

  const profile = profileResult.data as ProfileRecord | null;
  const verification = verificationResult.data as {
    student_id: string;
    verified_at: string | null;
  } | null;
  const courseIds = coursesResult.data.map((row) => row.course_id);
  const skillIds = skillsResult.data.map((row) => row.skill_id);
  const isComplete = Boolean(
    profile &&
      profile.full_name.length > 0 &&
      isDepartment(profile.department) &&
      profile.graduation_year !== null &&
      verification &&
      courseIds.length > 0 &&
      skillIds.length > 0,
  );

  return {
    profile,
    studentId: verification?.student_id ?? "",
    studentIdVerifiedAt: verification?.verified_at ?? null,
    courseIds,
    skillIds,
    isComplete,
  };
}
