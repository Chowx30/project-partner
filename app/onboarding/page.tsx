import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/auth/actions";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  type CourseOption,
  getOnboardingSnapshot,
  type SkillOption,
} from "@/src/lib/profile/data";
import { createClient } from "@/src/lib/supabase/server";

function UnavailableState() {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300">
      We could not load profile setup right now. Refresh the page to try again.
    </div>
  );
}

export default async function OnboardingPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  let snapshot;

  try {
    snapshot = await getOnboardingSnapshot(user.id);
  } catch {
    snapshot = null;
  }

  if (snapshot?.isComplete) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [coursesResult, skillsResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id, course_code, course_name")
      .order("course_code"),
    supabase.from("skills").select("id, name").order("name"),
  ]);
  const catalogUnavailable = coursesResult.error || skillsResult.error;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wide text-zinc-950 dark:text-white"
          >
            Project Partner
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Log out
            </button>
          </form>
        </header>

        <div className="py-10 sm:py-14">
          <div className="mb-8">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Student onboarding
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              Set up your profile
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Help other students understand your course context and skills.
            </p>
          </div>

          {!snapshot || catalogUnavailable ? (
            <UnavailableState />
          ) : (
            <OnboardingForm
              courses={coursesResult.data as CourseOption[]}
              skills={skillsResult.data as SkillOption[]}
              initialValues={{
                fullName: snapshot.profile?.full_name ?? "",
                department: snapshot.profile?.department ?? "",
                studentId: snapshot.studentId,
                graduationYear:
                  snapshot.profile?.graduation_year?.toString() ?? "",
                bio: snapshot.profile?.bio ?? "",
                courseIds: snapshot.courseIds,
                skillIds: snapshot.skillIds,
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
