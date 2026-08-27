import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import { PostTypeBadge } from "@/app/projects/post-type-badge";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption, SkillOption } from "@/src/lib/profile/data";
import type { ProjectPostType } from "@/src/lib/projects/validation";
import { createClient } from "@/src/lib/supabase/server";

type CurrentProjectStatus = "open" | "closed";

type CurrentProject = {
  id: string;
  owner_id: string;
  course_id: string;
  title: string;
  members_needed: number;
  post_type: ProjectPostType;
  status: CurrentProjectStatus;
  created_at: string;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

type OwnerSummary = {
  id: string;
  full_name: string;
};

function CurrentProjectCard({
  project,
  courseCode,
  relationship,
  acceptedMemberCount,
  ownerName,
}: {
  project: CurrentProject;
  courseCode: string;
  relationship: "Owner" | "Member";
  acceptedMemberCount?: number;
  ownerName?: string;
}) {
  const statusLabel =
    project.status.charAt(0).toUpperCase() + project.status.slice(1);

  return (
    <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <PostTypeBadge postType={project.post_type} />
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          {statusLabel}
        </span>
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {relationship}
        </span>
      </div>
      <h4 className="mt-3 font-semibold text-zinc-950 dark:text-white">
        {project.title}
      </h4>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {courseCode}
      </p>
      {relationship === "Owner" && acceptedMemberCount !== undefined && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Accepted members: {acceptedMemberCount} / {project.members_needed}
        </p>
      )}
      {relationship === "Member" && ownerName && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Owner: {ownerName}
        </p>
      )}
      <Link
        href={`/projects/${project.id}`}
        className="mt-4 inline-flex text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
      >
        View project
      </Link>
    </li>
  );
}

export default async function DashboardPage() {
  const { user, profile } = await requireCompletedProfile();
  const supabase = await createClient();
  const [
    userCoursesResult,
    userSkillsResult,
    ownedProjectsResult,
    membershipsResult,
    unreadNotificationsResult,
  ] = await Promise.all([
      supabase.from("user_courses").select("course_id").eq("user_id", user.id),
      supabase.from("user_skills").select("skill_id").eq("user_id", user.id),
      supabase
        .from("projects")
        .select(
          "id, owner_id, course_id, title, members_needed, post_type, status, created_at",
        )
        .eq("owner_id", user.id)
        .in("status", ["open", "closed"])
        .order("created_at", { ascending: false }),
      supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);

  if (
    userCoursesResult.error ||
    userSkillsResult.error ||
    ownedProjectsResult.error ||
    membershipsResult.error ||
    unreadNotificationsResult.error
  ) {
    throw new Error("Unable to load dashboard data.");
  }

  const ownedProjects = ownedProjectsResult.data as CurrentProject[];
  const unreadNotificationCount = unreadNotificationsResult.count ?? 0;
  const ownedProjectIds = new Set(ownedProjects.map((project) => project.id));
  const joinedProjectIds = [
    ...new Set(
      membershipsResult.data
        .map((membership) => membership.project_id)
        .filter((projectId) => !ownedProjectIds.has(projectId)),
    ),
  ];
  const joinedProjectsResult =
    joinedProjectIds.length > 0
      ? await supabase
          .from("projects")
          .select(
            "id, owner_id, course_id, title, members_needed, post_type, status, created_at",
          )
          .in("id", joinedProjectIds)
          .in("status", ["open", "closed"])
          .order("created_at", { ascending: false })
      : { data: [] as CurrentProject[], error: null };

  if (joinedProjectsResult.error) {
    throw new Error("Unable to load joined projects.");
  }

  const joinedProjects = (joinedProjectsResult.data as CurrentProject[]).filter(
    (project) => project.owner_id !== user.id,
  );
  const userCourseIds = userCoursesResult.data.map((row) => row.course_id);
  const userSkillIds = userSkillsResult.data.map((row) => row.skill_id);
  const allCourseIds = [
    ...new Set([
      ...userCourseIds,
      ...ownedProjects.map((project) => project.course_id),
      ...joinedProjects.map((project) => project.course_id),
    ]),
  ];
  const ownedIds = ownedProjects.map((project) => project.id);
  const joinedOwnerIds = [
    ...new Set(joinedProjects.map((project) => project.owner_id)),
  ];
  const coursesQuery =
    allCourseIds.length > 0
      ? supabase
          .from("courses")
          .select("id, course_code, course_name")
          .in("id", allCourseIds)
          .order("course_code")
      : Promise.resolve({ data: [] as CourseOption[], error: null });
  const skillsQuery =
    userSkillIds.length > 0
      ? supabase
          .from("skills")
          .select("id, name")
          .in("id", userSkillIds)
          .order("name")
      : Promise.resolve({ data: [] as SkillOption[], error: null });
  const ownedMembersQuery =
    ownedIds.length > 0
      ? supabase
          .from("project_members")
          .select("project_id, user_id")
          .in("project_id", ownedIds)
      : Promise.resolve({ data: [] as ProjectMemberRow[], error: null });
  const joinedOwnersQuery =
    joinedOwnerIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", joinedOwnerIds)
      : Promise.resolve({ data: [] as OwnerSummary[], error: null });
  const [coursesResult, skillsResult, ownedMembersResult, joinedOwnersResult] =
    await Promise.all([
      coursesQuery,
      skillsQuery,
      ownedMembersQuery,
      joinedOwnersQuery,
    ]);

  if (
    coursesResult.error ||
    skillsResult.error ||
    ownedMembersResult.error ||
    joinedOwnersResult.error
  ) {
    throw new Error("Unable to load dashboard project details.");
  }

  const allCourses = coursesResult.data as CourseOption[];
  const userCourseIdSet = new Set(userCourseIds);
  const courses = allCourses.filter((course) => userCourseIdSet.has(course.id));
  const skills = skillsResult.data as SkillOption[];
  const courseById = new Map(allCourses.map((course) => [course.id, course]));
  const ownerById = new Map(
    (joinedOwnersResult.data as OwnerSummary[]).map((owner) => [
      owner.id,
      owner,
    ]),
  );
  const ownedProjectById = new Map(
    ownedProjects.map((project) => [project.id, project]),
  );
  const acceptedCountByProject = new Map<string, number>();

  for (const member of ownedMembersResult.data as ProjectMemberRow[]) {
    const ownedProject = ownedProjectById.get(member.project_id);

    if (ownedProject && member.user_id !== ownedProject.owner_id) {
      acceptedCountByProject.set(
        member.project_id,
        (acceptedCountByProject.get(member.project_id) ?? 0) + 1,
      );
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
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

        <section className="py-12 sm:py-16">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
            Welcome, {profile.full_name}
          </h1>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            {profile.department} · {user.email}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/projects"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Browse partner posts
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Create partner post
            </Link>
            <Link
              href="/applications"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              My Applications
            </Link>
            <Link
              href="/notifications"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Notifications ({unreadNotificationCount})
            </Link>
          </div>

          <section className="mt-10">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Current teams
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              My Projects
            </h2>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Owned by me
                </h3>
                {ownedProjects.length === 0 ? (
                  <div className="mt-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      You haven&apos;t created any active projects yet.
                    </p>
                    <Link
                      href="/projects/new"
                      className="mt-3 inline-flex text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                    >
                      Create partner post
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {ownedProjects.map((project) => (
                      <CurrentProjectCard
                        key={project.id}
                        project={project}
                        courseCode={
                          courseById.get(project.course_id)?.course_code ??
                          "Course unavailable"
                        }
                        relationship="Owner"
                        acceptedMemberCount={
                          acceptedCountByProject.get(project.id) ?? 0
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Joined
                </h3>
                {joinedProjects.length === 0 ? (
                  <div className="mt-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      You haven&apos;t joined any active projects yet.
                    </p>
                    <Link
                      href="/projects"
                      className="mt-3 inline-flex text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                    >
                      Browse partner posts
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {joinedProjects.map((project) => (
                      <CurrentProjectCard
                        key={project.id}
                        project={project}
                        courseCode={
                          courseById.get(project.course_id)?.course_code ??
                          "Course unavailable"
                        }
                        relationship="Member"
                        ownerName={ownerById.get(project.owner_id)?.full_name}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Current courses
              </h2>
              <ul className="mt-4 space-y-3">
                {courses.map((course) => (
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
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Skills
              </h2>
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
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
