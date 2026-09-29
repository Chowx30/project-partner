import Link from "next/link";

import { ProjectForm } from "@/app/projects/new/project-form";
import { AppHeader } from "@/src/components/app-header";
import { Surface } from "@/src/components/ui/surface";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption } from "@/src/lib/profile/data";
import { createClient } from "@/src/lib/supabase/server";

export default async function NewProjectPage() {
  const { user } = await requireCompletedProfile();

  const supabase = await createClient();
  const coursesResult = await supabase
    .from("courses")
    .select("id, course_code, course_name")
    .order("course_code");

  if (coursesResult.error) {
    throw new Error("Unable to load the course catalog.");
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <AppHeader profileId={user.id} activeItem="projects" />

      <main className="mx-auto max-w-app pb-16 pt-8 sm:pb-20 sm:pt-12">
        <section aria-labelledby="create-project-heading">
          <div className="mx-auto max-w-form">
            <Link
              href="/projects"
              className="inline-flex min-h-11 items-center font-bold text-dark underline decoration-accent decoration-2 underline-offset-4 hover:decoration-dark"
            >
              Back to Projects <span aria-hidden="true">→</span>
            </Link>

            <div className="mt-6">
              <p className="inline-block rounded-control bg-accent px-3 py-1 text-sm font-black text-dark">
                Create opportunity
              </p>
              <h1
                id="create-project-heading"
                className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em] text-dark sm:text-5xl"
              >
                Create a Project
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Share what you are working on and find the right NSU students
                to join you.
              </p>
            </div>

            <Surface featured className="mt-8 p-0 sm:p-0">
              <ProjectForm courses={coursesResult.data as CourseOption[]} />
            </Surface>
          </div>
        </section>
      </main>
    </div>
  );
}
