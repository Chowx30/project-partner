import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicantActions } from "@/app/projects/[id]/applicant-actions";
import { ApplicationForm } from "@/app/projects/[id]/application-form";
import { CommentControls } from "@/app/projects/[id]/comment-controls";
import { CommentForm } from "@/app/projects/[id]/comment-form";
import { ReportControls } from "@/app/projects/[id]/report-controls";
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

type TeamMemberRow = {
  user_id: string;
  joined_at: string;
};

type TeamMemberDetails = TeamMemberRow & {
  profile: ApplicantProfile;
  skills: string[];
};

type CommentRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type CommentDetails = CommentRow & {
  author: ApplicantProfile;
};

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function wasCommentEdited(comment: CommentRow) {
  return (
    new Date(comment.updated_at).getTime() -
      new Date(comment.created_at).getTime() >
    1000
  );
}

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
  const [
    courseResult,
    ownerResult,
    teamMembershipsResult,
    applicationResult,
    commentsResult,
    projectReportResult,
  ] = await Promise.all([
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
        .select("user_id, joined_at")
        .eq("project_id", project.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("applications")
        .select("status")
        .eq("project_id", project.id)
        .eq("applicant_id", user.id)
        .maybeSingle(),
      supabase
        .from("comments")
        .select("id, user_id, content, created_at, updated_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("reports")
        .select("id")
        .eq("reporter_id", user.id)
        .eq("target_project_id", project.id)
        .maybeSingle(),
    ]);

  if (
    courseResult.error ||
    ownerResult.error ||
    teamMembershipsResult.error ||
    applicationResult.error ||
    commentsResult.error ||
    projectReportResult.error
  ) {
    throw new Error("Unable to load partner post details.");
  }

  if (!courseResult.data || !ownerResult.data) {
    notFound();
  }

  const course = courseResult.data as CourseOption;
  const owner = ownerResult.data as OwnerProfile;
  const teamMembershipRows = (
    teamMembershipsResult.data as TeamMemberRow[]
  ).filter((membership) => membership.user_id !== project.owner_id);
  const isProjectMember = teamMembershipRows.some(
    (membership) => membership.user_id === user.id,
  );
  const applicationStatus = applicationResult.data?.status as
    | ApplicationStatus
    | undefined;
  const statusLabel =
    project.status.charAt(0).toUpperCase() + project.status.slice(1);
  const acceptedMemberCount = teamMembershipRows.length;
  const commentRows = commentsResult.data as CommentRow[];
  const projectAlreadyReported = Boolean(projectReportResult.data);
  const reportedCommentIds = new Set<string>();
  let teamMembers: TeamMemberDetails[] = [];
  let applicants: ApplicantDetails[] = [];
  let comments: CommentDetails[] = [];

  if (commentRows.length > 0) {
    const commentAuthorIds = [
      ...new Set(commentRows.map((comment) => comment.user_id)),
    ];
    const [commentAuthorsResult, commentReportsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, department, graduation_year")
        .in("id", commentAuthorIds),
      supabase
        .from("reports")
        .select("target_comment_id")
        .eq("reporter_id", user.id)
        .in(
          "target_comment_id",
          commentRows.map((comment) => comment.id),
        ),
    ]);

    if (commentAuthorsResult.error || commentReportsResult.error) {
      throw new Error("Unable to load comment details.");
    }

    for (const report of commentReportsResult.data) {
      if (report.target_comment_id) {
        reportedCommentIds.add(report.target_comment_id);
      }
    }

    const commentAuthorById = new Map(
      (commentAuthorsResult.data as ApplicantProfile[]).map((author) => [
        author.id,
        author,
      ]),
    );

    comments = commentRows.map((comment) => {
      const author = commentAuthorById.get(comment.user_id);

      if (!author) {
        throw new Error("Unable to load a comment author.");
      }

      return { ...comment, author };
    });
  }

  if (teamMembershipRows.length > 0) {
    const teamMemberIds = teamMembershipRows.map(
      (membership) => membership.user_id,
    );
    const [teamProfilesResult, teamSkillsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, department, graduation_year")
        .in("id", teamMemberIds),
      supabase
        .from("user_skills")
        .select("user_id, skill_id")
        .in("user_id", teamMemberIds),
    ]);

    if (teamProfilesResult.error || teamSkillsResult.error) {
      throw new Error("Unable to load project team.");
    }

    const teamProfiles = teamProfilesResult.data as ApplicantProfile[];
    const teamProfileById = new Map(
      teamProfiles.map((profile) => [profile.id, profile]),
    );
    const teamSkillRows = teamSkillsResult.data as {
      user_id: string;
      skill_id: string;
    }[];
    const teamSkillIds = [
      ...new Set(teamSkillRows.map((row) => row.skill_id)),
    ];
    const teamSkillNameById = new Map<string, string>();

    if (teamSkillIds.length > 0) {
      const teamSkillCatalogResult = await supabase
        .from("skills")
        .select("id, name")
        .in("id", teamSkillIds)
        .order("name");

      if (teamSkillCatalogResult.error) {
        throw new Error("Unable to load project team skills.");
      }

      for (const skill of teamSkillCatalogResult.data) {
        teamSkillNameById.set(skill.id, skill.name);
      }
    }

    teamMembers = teamMembershipRows.map((membership) => {
      const profile = teamProfileById.get(membership.user_id);

      if (!profile) {
        throw new Error("Unable to load a team member.");
      }

      const skills = teamSkillRows
        .filter((row) => row.user_id === membership.user_id)
        .map((row) => teamSkillNameById.get(row.skill_id))
        .filter((name): name is string => Boolean(name));

      return { ...membership, profile, skills };
    });
  }

  if (isOwner) {
    const applicationsResult = await supabase
      .from("applications")
      .select("id, applicant_id, message, status, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (applicationsResult.error) {
      throw new Error("Unable to load project applications.");
    }

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

            {!isOwner && (
              <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
                <ReportControls
                  target="project"
                  targetId={project.id}
                  alreadyReported={projectAlreadyReported}
                />
              </div>
            )}
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

          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Current team
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
                  Team
                </h2>
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Accepted members: {acceptedMemberCount} /{" "}
                {project.members_needed}
              </p>
            </div>

            <ul className="mt-5 space-y-3">
              <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-zinc-950 dark:text-white">
                      {owner.full_name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {owner.department}
                      {owner.graduation_year
                        ? ` · Graduating ${owner.graduation_year}`
                        : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    Owner
                  </span>
                </div>
              </li>

              {teamMembers.map((member) => (
                <li
                  key={member.user_id}
                  className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-zinc-950 dark:text-white">
                        {member.profile.full_name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {member.profile.department}
                        {member.profile.graduation_year
                          ? ` · Graduating ${member.profile.graduation_year}`
                          : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      Member
                    </span>
                  </div>

                  {member.skills.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {member.skills.map((skill) => (
                        <li
                          key={skill}
                          className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
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

          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Discussion
              </p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
                Comments
              </h2>
            </div>

            {comments.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
                No comments yet. Start the discussion.
              </p>
            ) : (
              <ul className="mt-5 space-y-4">
                {comments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-xl border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-zinc-950 dark:text-white">
                          {comment.author.full_name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {comment.author.department}
                          {comment.author.graduation_year
                            ? ` · Graduating ${comment.author.graduation_year}`
                            : ""}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatProjectDate(comment.created_at)}
                        {wasCommentEdited(comment) ? " · Edited" : ""}
                      </p>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                      {comment.content}
                    </p>

                    {comment.user_id === user.id ? (
                      <CommentControls
                        commentId={comment.id}
                        content={comment.content}
                      />
                    ) : (
                      <div className="mt-4">
                        <ReportControls
                          target="comment"
                          targetId={comment.id}
                          alreadyReported={reportedCommentIds.has(comment.id)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {project.status === "open" || project.status === "closed" ? (
              <CommentForm projectId={project.id} />
            ) : (
              <p className="mt-6 border-t border-zinc-200 pt-5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                Comments are closed for this project.
              </p>
            )}
          </section>
        </article>
      </div>
    </main>
  );
}
