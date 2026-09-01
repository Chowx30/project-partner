import Link from "next/link";
import { notFound } from "next/navigation";

import { reportUserAction } from "@/app/profile/[id]/actions";
import { PostTypeBadge } from "@/app/projects/post-type-badge";
import { ProjectsHeader } from "@/app/projects/projects-header";
import { ReportForm } from "@/src/components/report-form";
import { PROFILE_PROJECT_LIMIT } from "@/src/lib/pagination";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption, SkillOption } from "@/src/lib/profile/data";
import { isUuid } from "@/src/lib/profile/validation";
import type { ProjectPostType } from "@/src/lib/projects/validation";
import { createClient } from "@/src/lib/supabase/server";

type PublicProfile = {
  id: string;
  full_name: string;
  department: string;
  bio: string | null;
  graduation_year: number | null;
};

type PublicProject = {
  id: string;
  owner_id: string;
  course_id: string;
  title: string;
  post_type: ProjectPostType;
  status: "open" | "closed" | "completed";
  created_at: string;
};

type JoinedMembershipRow = {
  project_id: string;
  joined_at: string;
};

function initials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toUpperCase() ?? "")
    .join("");
}

function statusLabel(status: PublicProject["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function ProjectList({
  projects,
  courseById,
  emptyMessage,
}: {
  projects: PublicProject[];
  courseById: Map<string, CourseOption>;
  emptyMessage: string;
}) {
  if (projects.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {projects.map((project) => (
        <li
          key={project.id}
          className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-center gap-2">
            <PostTypeBadge postType={project.post_type} />
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {statusLabel(project.status)}
            </span>
          </div>
          <h3 className="mt-3 font-semibold text-zinc-950 dark:text-white">
            {project.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {courseById.get(project.course_id)?.course_code ??
              "Course unavailable"}
          </p>
          <Link
            href={`/projects/${project.id}`}
            className="mt-4 inline-flex text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
          >
            View project
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireCompletedProfile();
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const supabase = await createClient();
  const profileResult = await supabase
    .from("profiles")
    .select("id, full_name, department, bio, graduation_year")
    .eq("id", id)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error("Unable to load this profile.");
  }

  if (!profileResult.data) {
    notFound();
  }

  const profile = profileResult.data as PublicProfile;
  const isOwnProfile = profile.id === user.id;
  const reportQuery = isOwnProfile
    ? Promise.resolve({ data: null, error: null })
    : supabase
        .from("reports")
        .select("id")
        .eq("reporter_id", user.id)
        .eq("target_user_id", profile.id)
        .maybeSingle();
  const [userSkillsResult, userCoursesResult, ownedProjectsResult, membershipsResult, reportResult] =
    await Promise.all([
      supabase
        .from("user_skills")
        .select("skill_id")
        .eq("user_id", profile.id),
      supabase
        .from("user_courses")
        .select("course_id")
        .eq("user_id", profile.id),
      supabase
        .from("projects")
        .select("id, owner_id, course_id, title, post_type, status, created_at")
        .eq("owner_id", profile.id)
        .in("status", ["open", "closed", "completed"])
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PROFILE_PROJECT_LIMIT),
      supabase
        .from("project_members")
        .select("project_id, joined_at")
        .eq("user_id", profile.id)
        .order("joined_at", { ascending: false })
        .order("project_id", { ascending: false })
        .limit(PROFILE_PROJECT_LIMIT),
      reportQuery,
    ]);

  if (
    userSkillsResult.error ||
    userCoursesResult.error ||
    ownedProjectsResult.error ||
    membershipsResult.error ||
    reportResult.error
  ) {
    throw new Error("Unable to load public profile details.");
  }

  const ownedProjects = ownedProjectsResult.data as PublicProject[];
  const joinedProjectIds = [
    ...new Set(
      (membershipsResult.data as JoinedMembershipRow[]).map(
        (membership) => membership.project_id,
      ),
    ),
  ];
  const joinedProjectsResult =
    joinedProjectIds.length > 0
      ? await supabase
          .from("projects")
          .select("id, owner_id, course_id, title, post_type, status, created_at")
          .in("id", joinedProjectIds)
          .in("status", ["open", "closed", "completed"])
          .limit(PROFILE_PROJECT_LIMIT)
      : { data: [] as PublicProject[], error: null };

  if (joinedProjectsResult.error) {
    throw new Error("Unable to load joined projects.");
  }

  const joinedProjectById = new Map(
    (joinedProjectsResult.data as PublicProject[]).map((project) => [
      project.id,
      project,
    ]),
  );
  const joinedProjects = joinedProjectIds
    .map((projectId) => joinedProjectById.get(projectId))
    .filter(
      (project): project is PublicProject =>
        project !== undefined && project.owner_id !== profile.id,
    );
  const skillIds = userSkillsResult.data.map((row) => row.skill_id);
  const currentCourseIds = userCoursesResult.data.map((row) => row.course_id);
  const allCourseIds = [
    ...new Set([
      ...currentCourseIds,
      ...ownedProjects.map((project) => project.course_id),
      ...joinedProjects.map((project) => project.course_id),
    ]),
  ];
  const skillsQuery =
    skillIds.length > 0
      ? supabase
          .from("skills")
          .select("id, name")
          .in("id", skillIds)
          .order("name")
      : Promise.resolve({ data: [] as SkillOption[], error: null });
  const coursesQuery =
    allCourseIds.length > 0
      ? supabase
          .from("courses")
          .select("id, course_code, course_name")
          .in("id", allCourseIds)
          .order("course_code")
      : Promise.resolve({ data: [] as CourseOption[], error: null });
  const [skillsResult, coursesResult] = await Promise.all([
    skillsQuery,
    coursesQuery,
  ]);

  if (skillsResult.error || coursesResult.error) {
    throw new Error("Unable to load profile catalogs.");
  }

  const skills = skillsResult.data as SkillOption[];
  const allCourses = coursesResult.data as CourseOption[];
  const currentCourseIdSet = new Set(currentCourseIds);
  const currentCourses = allCourses.filter((course) =>
    currentCourseIdSet.has(course.id),
  );
  const courseById = new Map(
    allCourses.map((course) => [course.id, course]),
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <ProjectsHeader />

        <article className="py-10 sm:py-14">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            ← Back to dashboard
          </Link>

          <section className="mt-7 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {initials(profile.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Profile
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                  {profile.full_name}
                </h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {profile.department}
                  {profile.graduation_year
                    ? ` · Graduating ${profile.graduation_year}`
                    : ""}
                </p>

                <div className="mt-5">
                  {isOwnProfile ? (
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      This is your profile
                    </p>
                  ) : (
                    <ReportForm
                      action={reportUserAction.bind(null, profile.id)}
                      alreadyReported={Boolean(reportResult.data)}
                      controlId={`report-user-${profile.id}`}
                      triggerLabel="Report user"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-7 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Bio
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {profile.bio ?? "No bio added yet."}
              </p>
            </div>
          </section>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Skills
              </h2>
              {skills.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  No skills added yet.
                </p>
              ) : (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <li
                      key={skill.id}
                      className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {skill.name}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Current Courses
              </h2>
              {currentCourses.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  No current courses listed.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {currentCourses.map((course) => (
                    <li key={course.id} className="text-sm">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {course.course_code}
                      </span>
                      <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                        {course.course_name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Projects
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              Project history
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <section>
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Owned
                </h3>
                <ProjectList
                  projects={ownedProjects}
                  courseById={courseById}
                  emptyMessage="No owned projects to show."
                />
              </section>
              <section>
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Joined
                </h3>
                <ProjectList
                  projects={joinedProjects}
                  courseById={courseById}
                  emptyMessage="No joined projects to show."
                />
              </section>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
