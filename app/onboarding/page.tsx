import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/auth/actions";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { EmptyState } from "@/src/components/empty-state";
import { Button } from "@/src/components/ui/button";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  type CourseOption,
  getOnboardingSnapshot,
  type SkillOption,
} from "@/src/lib/profile/data";
import { createClient } from "@/src/lib/supabase/server";

function UnavailableState() {
  return (
    <EmptyState
      title="Profile setup is unavailable"
      description="We could not load profile setup right now. Refresh the page to try again."
      className="border-danger bg-white"
    />
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
    <div className="min-h-screen bg-white">
      <header className="border-b-2 border-dark bg-white">
        <div className="mx-auto flex min-h-20 max-w-reading items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-black tracking-tight sm:text-lg"
          >
            <span className="grid size-9 place-items-center rounded-full border-2 border-dark bg-accent text-sm">
              PP
            </span>
            Project Partner
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-muted sm:inline">
              Complete your profile
            </span>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="secondary"
                className="px-3 sm:px-4"
              >
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-reading px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 sm:mb-12">
          <p className="inline-block rounded-control bg-accent px-3 py-1 text-sm font-black">
            Set up your profile
          </p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.035em] sm:text-5xl">
            Build your student profile
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Add your academic information, current courses, and skills so teams
            can find the right match.
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
      </main>
    </div>
  );
}
