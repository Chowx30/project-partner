"use client";

import { useActionState, useMemo, useState } from "react";

import { createProjectAction } from "@/app/projects/new/actions";
import {
  initialCreateProjectFormState,
  type CreateProjectFieldErrors,
} from "@/app/projects/new/form-state";
import type { CourseOption } from "@/src/lib/profile/data";
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_MEMBERS_MAX,
  PROJECT_MEMBERS_MIN,
  PROJECT_TITLE_MAX_LENGTH,
} from "@/src/lib/projects/validation";

const inputClassName =
  "mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300";

function FieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

export function ProjectForm({ courses }: { courses: CourseOption[] }) {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    initialCreateProjectFormState,
  );
  const [courseQuery, setCourseQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const errors: CreateProjectFieldErrors = state.errors ?? {};
  const filteredCourses = useMemo(() => {
    const query = courseQuery.trim().toLowerCase();

    if (!query) {
      return courses;
    }

    return courses.filter(
      (course) =>
        course.id === selectedCourseId ||
        `${course.course_code} ${course.course_name}`
          .toLowerCase()
          .includes(query),
    );
  }, [courseQuery, courses, selectedCourseId]);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="postType"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Post type
        </label>
        <select
          id="postType"
          name="postType"
          defaultValue="project"
          required
          disabled={pending}
          aria-invalid={Boolean(errors.postType)}
          aria-describedby={errors.postType ? "post-type-error" : undefined}
          className={inputClassName}
        >
          <option value="project">Project Partner</option>
          <option value="lab">Lab Partner</option>
        </select>
        <FieldError id="post-type-error" message={errors.postType} />
      </div>

      <div>
        <label
          htmlFor="courseSearch"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Search courses
        </label>
        <input
          id="courseSearch"
          type="search"
          value={courseQuery}
          onChange={(event) => setCourseQuery(event.target.value)}
          disabled={pending}
          placeholder="Search by course code or name"
          className={inputClassName}
        />
        <label
          htmlFor="courseId"
          className="mt-4 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Course
        </label>
        <select
          id="courseId"
          name="courseId"
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
          required
          disabled={pending}
          aria-invalid={Boolean(errors.courseId)}
          aria-describedby={errors.courseId ? "course-error" : undefined}
          className={inputClassName}
        >
          <option value="">Choose a course</option>
          {filteredCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.course_code} — {course.course_name}
            </option>
          ))}
        </select>
        {filteredCourses.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No matching courses found.
          </p>
        )}
        <FieldError id="course-error" message={errors.courseId} />
      </div>

      <div>
        <label
          htmlFor="title"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={PROJECT_TITLE_MAX_LENGTH}
          disabled={pending}
          placeholder="Need 2 teammates for CSE327 project"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          className={inputClassName}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div>
        <label
          htmlFor="description"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Short description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          required
          maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
          disabled={pending}
          placeholder="Describe the work, timeline, and partner you are looking for."
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
          className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div>
        <label
          htmlFor="membersNeeded"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Members needed
        </label>
        <input
          id="membersNeeded"
          name="membersNeeded"
          type="number"
          inputMode="numeric"
          min={PROJECT_MEMBERS_MIN}
          max={PROJECT_MEMBERS_MAX}
          step={1}
          required
          disabled={pending}
          aria-invalid={Boolean(errors.membersNeeded)}
          aria-describedby={
            errors.membersNeeded ? "members-needed-error" : undefined
          }
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Additional members, excluding you.
        </p>
        <FieldError
          id="members-needed-error"
          message={errors.membersNeeded}
        />
      </div>

      {state.message && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? "Creating post…" : "Create post"}
      </button>
    </form>
  );
}
