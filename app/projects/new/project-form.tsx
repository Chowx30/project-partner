"use client";

import { useActionState, useMemo, useState } from "react";

import { createProjectAction } from "@/app/projects/new/actions";
import {
  initialCreateProjectFormState,
  type CreateProjectFieldErrors,
} from "@/app/projects/new/form-state";
import type { CourseOption } from "@/src/lib/profile/data";
import { Button } from "@/src/components/ui/button";
import {
  errorTextStyles,
  helpTextStyles,
  inputStyles,
  labelStyles,
  selectStyles,
  textareaStyles,
} from "@/src/components/ui/form-controls";
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_MEMBERS_MAX,
  PROJECT_MEMBERS_MIN,
  PROJECT_TITLE_MAX_LENGTH,
} from "@/src/lib/projects/validation";

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
    <p id={id} className={errorTextStyles}>
      {message}
    </p>
  );
}

function SectionHeading({
  id,
  number,
  children,
}: {
  id: string;
  number: string;
  children: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-dark bg-accent text-xs font-black text-dark">
        {number}
      </span>
      <h2
        id={id}
        className="text-lg font-black tracking-tight text-dark sm:text-xl"
      >
        {children}
      </h2>
    </div>
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
    <form action={formAction}>
      <section className="p-5 sm:p-7" aria-labelledby="project-basics-heading">
        <SectionHeading id="project-basics-heading" number="01">
          Project Basics
        </SectionHeading>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="postType" className={labelStyles}>
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
              className={`${selectStyles} mt-2`}
            >
              <option value="project">Project Partner</option>
              <option value="lab">Lab Partner</option>
            </select>
            <FieldError id="post-type-error" message={errors.postType} />
          </div>

          <div>
            <label htmlFor="courseSearch" className={labelStyles}>
              Search courses
            </label>
            <input
              id="courseSearch"
              type="search"
              value={courseQuery}
              onChange={(event) => setCourseQuery(event.target.value)}
              disabled={pending}
              placeholder="Search by course code or name"
              className={`${inputStyles} mt-2`}
            />
            <label htmlFor="courseId" className={`${labelStyles} mt-4`}>
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
              className={`${selectStyles} mt-2`}
            >
              <option value="">Choose a course</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_code} — {course.course_name}
                </option>
              ))}
            </select>
            {filteredCourses.length === 0 && (
              <p className={helpTextStyles}>No matching courses found.</p>
            )}
            <FieldError id="course-error" message={errors.courseId} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="title" className={labelStyles}>
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
              className={`${inputStyles} mt-2`}
            />
            <FieldError id="title-error" message={errors.title} />
          </div>
        </div>
      </section>

      <section
        className="border-t-2 border-dark bg-surface p-5 sm:p-7"
        aria-labelledby="team-requirements-heading"
      >
        <SectionHeading id="team-requirements-heading" number="02">
          Team Requirements
        </SectionHeading>
        <div className="max-w-xs">
          <label htmlFor="membersNeeded" className={labelStyles}>
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
              errors.membersNeeded
                ? "members-needed-help members-needed-error"
                : "members-needed-help"
            }
            className={`${inputStyles} mt-2`}
          />
          <p id="members-needed-help" className={helpTextStyles}>
            Additional members, excluding you.
          </p>
          <FieldError id="members-needed-error" message={errors.membersNeeded} />
        </div>
      </section>

      <section
        className="border-t-2 border-dark p-5 sm:p-7"
        aria-labelledby="project-details-heading"
      >
        <SectionHeading id="project-details-heading" number="03">
          Project Details
        </SectionHeading>
        <label htmlFor="description" className={labelStyles}>
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
          className={`${textareaStyles} mt-2`}
        />
        <FieldError id="description-error" message={errors.description} />
      </section>

      <section
        className="border-t-2 border-dark bg-surface p-5 sm:p-7"
        aria-labelledby="publish-heading"
      >
        <SectionHeading id="publish-heading" number="04">
          Publish
        </SectionHeading>
        {state.message && (
          <p
            role="alert"
            className="mb-5 rounded-control border-2 border-danger bg-white p-4 text-sm font-medium text-danger"
          >
            {state.message}
          </p>
        )}

        <div className="flex justify-stretch sm:justify-end">
          <Button
            type="submit"
            disabled={pending}
            variant="accent"
            featured
            className="w-full sm:w-auto sm:min-w-44"
          >
            {pending ? "Creating Project…" : "Create Project"}
          </Button>
        </div>
      </section>
    </form>
  );
}
