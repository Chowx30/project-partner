import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicantActions } from "@/app/projects/[id]/applicant-actions";
import { ApplicationForm } from "@/app/projects/[id]/application-form";
import { PostTypeBadge } from "@/app/projects/post-type-badge";
import { ProjectsHeader } from "@/app/projects/projects-header";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption, ProfileRecord } from "@/src/lib/profile/data";
import { isUuid } from "@/src/lib/profile/validation";
import {
  formatProjectDate,
  type ProjectPostType,
} from "@/src/lib/projects/validation";
import { createClient } from "@/src/lib/supabase/server";

type ProjectDetail = {
  id: string;
  owner_id: string;
  course_id: string;
  title: string;
  short_description: string;
  members_needed: number;
  post_type: ProjectPostType;
  status: "open" | "closed" | "completed" | "cancelled";
  created_at: string;
};

type OwnerProfile = Pick<
  ProfileRecord,
  "full_name" | "department" | "graduation_year"
>;

type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

type OwnerApplication = {
  id: string;
  applicant_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
};

type ApplicantProfile = {
  id: string;
  full_name: string;
  department: string;
  graduation_year: number | null;
};

type ApplicantDetails = OwnerApplication & {
  profile: ApplicantProfile;
  skills: string[];
};

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export default async function ProjectDetailPage({
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
  const projectResult = await supabase
    .from("projects")
    .select(
      "id, owner_id, course_id, title, short_description, members_needed, post_type, status, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (projectResult.error) {
    throw new Error("Unable to load this partner post.");
  }

  if (!projectResult.data) {
    notFound();
  }

  const project = projectResult.data as ProjectDetail;
  const isOwner = project.owner_id === user.id;
  const [courseResult, ownerResult, membershipResult, applicationResult] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, course_code, course_name")
        .eq("id", project.course_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, department, graduation_year")
        .eq("id", project.owner_id)
        .maybeSingle(),
      supabase
        .from("project_members")
        .select("project_id")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("status")
        .eq("project_id", project.id)
        .eq("applicant_id", user.id)
        .maybeSingle(),
    ]);

  if (
    courseResult.error ||
    ownerResult.error ||
    membershipResult.error ||
    applicationResult.error
  ) {
    throw new Error("Unable to load partner post details.");
  }

  if (!courseResult.data || !ownerResult.data) {
    notFound();
  }

  const course = courseResult.data as CourseOption;
  const owner = ownerResult.data as OwnerProfile;
  const isProjectMember = Boolean(membershipResult.data);
  const applicationStatus = applicationResult.data?.status as
    | ApplicationStatus
    | undefined;
  const statusLabel =
    project.status.charAt(0).toUpperCase() + project.status.slice(1);
  let acceptedMemberCount = 0;
  let applicants: ApplicantDetails[] = [];

  if (isOwner) {
    const [applicationsResult, memberCountResult] = await Promise.all([
      supabase
        .from("applications")
        .select("id, applicant_id, message, status, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_members")
        .select("user_id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .neq("user_id", project.owner_id),
    ]);

    if (applicationsResult.error || memberCountResult.error) {
      throw new Error("Unable to load project applications.");
    }

    acceptedMemberCount = memberCountResult.count ?? 0;
    const applicationRows = applicationsResult.data as OwnerApplication[];
    const orderedApplications = [
      ...applicationRows.filter((row) => row.status === "pending"),
      ...applicationRows.filter((row) => row.status !== "pending"),
    ];
    const applicantIds = orderedApplications.map((row) => row.applicant_id);

    if (applicantIds.length > 0) {
      const [profilesResult, userSkillsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, department, graduation_year")
          .in("id", applicantIds),
        supabase
          .from("user_skills")
          .select("user_id, skill_id")
          .in("user_id", applicantIds),
      ]);

      if (profilesResult.error || userSkillsResult.error) {
        throw new Error("Unable to load applicant details.");
      }

      const profiles = profilesResult.data as ApplicantProfile[];
      const profileById = new Map(
        profiles.map((profile) => [profile.id, profile]),
      );
      const userSkillRows = userSkillsResult.data as {
        user_id: string;
        skill_id: string;
      }[];
      const skillIds = [...new Set(userSkillRows.map((row) => row.skill_id))];
      const skillNameById = new Map<string, string>();

      if (skillIds.length > 0) {
        const skillsResult = await supabase
          .from("skills")
          .select("id, name")
          .in("id", skillIds)
          .order("name");

        if (skillsResult.error) {
          throw new Error("Unable to load applicant skills.");
        }

        for (const skill of skillsResult.data) {
          skillNameById.set(skill.id, skill.name);
        }
      }

      applicants = orderedApplications.map((application) => {
        const profile = profileById.get(application.applicant_id);

        if (!profile) {
          throw new Error("Unable to load applicant profile.");
        }

        const skills = userSkillRows
          .filter((row) => row.user_id === application.applicant_id)
          .map((row) => skillNameById.get(row.skill_id))
          .filter((name): name is string => Boolean(name));

        return { ...application, profile, skills };
      });
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <ProjectsHeader />

        <article className="py-10 sm:py-14">
          <Link
            href="/projects"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            ← Back to partner posts
          </Link>

          <div className="mt-7 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-3">
              <PostTypeBadge postType={project.post_type} />
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {statusLabel}
              </span>
              {isOwner && (
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Your post
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              {project.title}
            </h1>
            <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {course.course_code} · {course.course_name}
            </p>
            <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-zinc-700 dark:text-zinc-300">
              {project.short_description}
            </p>

            <dl className="mt-8 grid gap-5 border-t border-zinc-200 pt-6 sm:grid-cols-2 dark:border-zinc-800">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Members needed
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {project.members_needed}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Created
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatProjectDate(project.created_at)}
                </dd>
              </div>
            </dl>
          </div>

          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Posted by
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
              {owner.full_name}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {owner.department}
              {owner.graduation_year
                ? ` · Graduating ${owner.graduation_year}`
                : ""}
            </p>
          </section>

          {!isOwner && (
            <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Apply to join
              </h2>

              {isProjectMember && (
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  You are already a member of this project.
                </p>
              )}

              {applicationStatus && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>Application status:</span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {APPLICATION_STATUS_LABELS[applicationStatus]}
                  </span>
                </div>
              )}

              {!isProjectMember &&
                !applicationStatus &&
                project.status !== "open" && (
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    This project is no longer accepting applications.
                  </p>
                )}

              {!isProjectMember &&
                !applicationStatus &&
                project.status === "open" && (
                  <ApplicationForm projectId={project.id} />
                )}
            </section>
          )}

          {isOwner && (
            <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Partner requests
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
                    Applicants
                  </h2>
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Accepted members: {acceptedMemberCount} /{" "}
                  {project.members_needed}
                </p>
              </div>

              {applicants.length === 0 ? (
                <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
                  No applications yet.
                </p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {applicants.map((application) => (
                    <li
                      key={application.id}
                      className="rounded-xl border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-zinc-950 dark:text-white">
                            {application.profile.full_name}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {application.profile.department}
                            {application.profile.graduation_year
                              ? ` · Graduating ${application.profile.graduation_year}`
                              : ""}
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {APPLICATION_STATUS_LABELS[application.status]}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {application.message ??
                          "No application message provided."}
                      </p>

                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Skills
                        </p>
                        {application.skills.length > 0 ? (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {application.skills.map((skill) => (
                              <li
                                key={skill}
                                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                              >
                                {skill}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            No skills listed.
                          </p>
                        )}
                      </div>

                      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                        Applied {formatProjectDate(application.created_at)}
                      </p>

                      {application.status === "pending" && (
                        <ApplicantActions
                          applicationId={application.id}
                          canAccept={
                            project.status === "open" &&
                            acceptedMemberCount < project.members_needed
                          }
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
