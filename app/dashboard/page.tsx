import Link from "next/link";

import { PostTypeBadge } from "@/app/projects/post-type-badge";
import { AppHeader } from "@/src/components/app-header";
import { EmptyState } from "@/src/components/empty-state";
import { StatusBadge } from "@/src/components/status-badge";
import { ButtonLink } from "@/src/components/ui/button";
import { DASHBOARD_PROJECT_LIMIT } from "@/src/lib/pagination";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption, SkillOption } from "@/src/lib/profile/data";
import {
  PROJECT_MEMBERS_MAX,
  type ProjectPostType,
} from "@/src/lib/projects/validation";
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

type JoinedMembershipRow = {
  project_id: string;
  joined_at: string;
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
  return (
    <li
      className={`rounded-feature border-2 border-dark p-5 sm:p-6 ${
        relationship === "Owner" ? "bg-white shadow-card" : "bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border-2 border-dark bg-accent px-2.5 py-1 text-xs font-bold text-dark">
            {courseCode}
          </span>
          <PostTypeBadge postType={project.post_type} />
          <StatusBadge status={project.status} />
        </div>
        <span className="text-xs font-black uppercase tracking-[0.12em] text-muted">
          {relationship === "Owner" ? "Project owner" : "Team member"}
        </span>
      </div>

      <h3 className="mt-5 text-xl font-black leading-snug tracking-tight text-dark">
        {project.title}
      </h3>
      {relationship === "Owner" && acceptedMemberCount !== undefined && (
        <p className="mt-3 text-sm leading-6 text-muted">
          Accepted members: {acceptedMemberCount} / {project.members_needed}
        </p>
      )}
      {relationship === "Member" && ownerName && (
        <p className="mt-3 text-sm leading-6 text-muted">
          Owner: {ownerName}
        </p>
      )}
      <Link
        href={`/projects/${project.id}`}
        className="mt-5 inline-flex min-h-11 items-center font-bold text-dark underline decoration-accent decoration-2 underline-offset-4 hover:decoration-dark"
      >
        View Project <span aria-hidden="true">→</span>
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
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(DASHBOARD_PROJECT_LIMIT),
      supabase
        .from("project_members")
        .select("project_id, joined_at")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .order("project_id", { ascending: false })
        .limit(DASHBOARD_PROJECT_LIMIT),
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
      (membershipsResult.data as JoinedMembershipRow[])
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
          .limit(DASHBOARD_PROJECT_LIMIT)
      : { data: [] as CurrentProject[], error: null };

  if (joinedProjectsResult.error) {
    throw new Error("Unable to load joined projects.");
  }

  const joinedProjectById = new Map(
    (joinedProjectsResult.data as CurrentProject[]).map((project) => [
      project.id,
      project,
    ]),
  );
  const joinedProjects = joinedProjectIds
    .map((projectId) => joinedProjectById.get(projectId))
    .filter(
      (project): project is CurrentProject =>
        project !== undefined && project.owner_id !== user.id,
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
          .limit(DASHBOARD_PROJECT_LIMIT * PROJECT_MEMBERS_MAX)
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
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <AppHeader profileId={user.id} activeItem="dashboard" />

      <main className="mx-auto max-w-app pb-16 pt-8 sm:pb-20 sm:pt-12">
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-feature border-2 border-dark bg-surface p-6 shadow-card sm:p-9">
            <p className="inline-block rounded-control bg-accent px-3 py-1 text-sm font-black">
              Your workspace
            </p>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.035em] sm:text-5xl">
              Welcome back, {profile.full_name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Keep track of your teams, projects, and current academic interests.
            </p>
            <p className="mt-3 text-sm font-semibold text-dark">
              {profile.department} · {user.email}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink
                href="/projects/new"
                variant="accent"
                featured
                className="w-full sm:w-auto"
              >
                Create Project
              </ButtonLink>
              <ButtonLink
                href="/projects"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Browse Projects
              </ButtonLink>
            </div>

            <nav
              aria-label="Dashboard shortcuts"
              className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-dark pt-5 text-sm font-bold"
            >
              <Link
                href={`/profile/${user.id}`}
                className="inline-flex min-h-11 items-center underline decoration-accent decoration-2 underline-offset-4 hover:decoration-dark"
              >
                My Profile
              </Link>
              <Link
                href="/applications"
                className="inline-flex min-h-11 items-center underline decoration-accent decoration-2 underline-offset-4 hover:decoration-dark"
              >
                My Applications
              </Link>
            </nav>
          </div>

          <aside
            aria-labelledby="notifications-summary-heading"
            className="flex flex-col rounded-feature border-2 border-dark bg-dark p-6 text-white shadow-card sm:p-8"
          >
            <p className="text-sm font-black uppercase tracking-[0.16em] text-accent">
              Stay current
            </p>
            <h2
              id="notifications-summary-heading"
              className="mt-4 text-2xl font-black tracking-tight"
            >
              Notifications
            </h2>
            <p className="mt-8 text-7xl font-black leading-none text-accent">
              {unreadNotificationCount}
            </p>
            <p className="mt-2 text-base text-white/75">
              {unreadNotificationCount === 0
                ? "You’re all caught up."
                : "Unread notifications"}
            </p>
            <ButtonLink
              href="/notifications"
              variant="accent"
              className="mt-8 w-full lg:mt-auto"
            >
              View Notifications
            </ButtonLink>
          </aside>
        </section>

        <section className="mt-16" aria-labelledby="owned-projects-heading">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-block rounded-control bg-accent px-3 py-1 text-sm font-black">
                Projects you lead
              </p>
              <h2
                id="owned-projects-heading"
                className="mt-4 text-3xl font-black tracking-tight sm:text-4xl"
              >
                Owned Projects
              </h2>
            </div>
            <ButtonLink href="/projects/new" variant="secondary">
              Create Project
            </ButtonLink>
          </div>

          {ownedProjects.length === 0 ? (
            <EmptyState
              title="No owned projects yet"
              description="You haven’t created any active projects yet."
              action={
                <ButtonLink href="/projects/new" variant="accent">
                  Create Project
                </ButtonLink>
              }
              className="mt-6"
            />
          ) : (
            <ul className="mt-7 grid gap-6 md:grid-cols-2">
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

        <section className="mt-16" aria-labelledby="joined-projects-heading">
          <div>
            <p className="inline-block rounded-control bg-accent px-3 py-1 text-sm font-black">
              Teams you joined
            </p>
            <h2
              id="joined-projects-heading"
              className="mt-4 text-3xl font-black tracking-tight sm:text-4xl"
            >
              Joined Projects
            </h2>
          </div>

          {joinedProjects.length === 0 ? (
            <EmptyState
              title="No joined projects yet"
              description="You haven’t joined any active projects yet."
              action={
                <ButtonLink href="/projects" variant="secondary">
                  Browse Projects
                </ButtonLink>
              }
              className="mt-6 bg-white"
            />
          ) : (
            <ul className="mt-7 grid gap-6 md:grid-cols-2">
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

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <section
            aria-labelledby="current-courses-heading"
            className="rounded-feature border-2 border-dark bg-surface p-6 sm:p-8"
          >
            <h2
              id="current-courses-heading"
              className="text-2xl font-black tracking-tight"
            >
              <span className="rounded-control bg-accent px-2.5 py-1">
                Current Courses
              </span>
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <li
                  key={course.id}
                  className="rounded-card border-2 border-dark bg-white p-4"
                >
                  <span className="font-black text-dark">
                    {course.course_code}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted">
                    {course.course_name}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="skills-heading"
            className="rounded-feature border-2 border-dark bg-white p-6 shadow-card sm:p-8"
          >
            <h2
              id="skills-heading"
              className="text-2xl font-black tracking-tight"
            >
              <span className="rounded-control bg-accent px-2.5 py-1">
                Skills
              </span>
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {skills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-full border-2 border-dark bg-surface px-3 py-1.5 text-sm font-semibold text-dark"
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
