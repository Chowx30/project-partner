"use client";

import { useActionState, useMemo, useState } from "react";

import { completeOnboardingAction } from "@/app/onboarding/actions";
import {
  initialOnboardingFormState,
  type OnboardingFieldErrors,
} from "@/app/onboarding/form-state";
import type { CourseOption, SkillOption } from "@/src/lib/profile/data";
import {
  BIO_MAX_LENGTH,
  DEPARTMENTS,
  FULL_NAME_MAX_LENGTH,
  MAX_GRADUATION_YEAR,
  MIN_GRADUATION_YEAR,
  STUDENT_ID_MAX_LENGTH,
} from "@/src/lib/profile/validation";

type InitialValues = {
  fullName: string;
  department: string;
  studentId: string;
  graduationYear: string;
  bio: string;
  courseIds: string[];
  skillIds: string[];
};

type CatalogItem = {
  id: string;
  title: string;
  description?: string;
  searchText: string;
};

type SelectionListProps = {
  idPrefix: string;
  name: "courseIds" | "skillIds";
  legend: string;
  searchLabel: string;
  items: CatalogItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  error?: string;
  pending: boolean;
};

const inputClassName =
  "mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

function SelectionList({
  idPrefix,
  name,
  legend,
  searchLabel,
  items,
  selectedIds,
  onToggle,
  error,
  pending,
}: SelectionListProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCount = items.filter((item) =>
    item.searchText.includes(normalizedQuery),
  ).length;
  const errorId = `${idPrefix}-error`;

  return (
    <fieldset aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}>
      <div className="flex items-baseline justify-between gap-4">
        <legend className="text-base font-semibold text-zinc-950 dark:text-white">
          {legend}
        </legend>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedIds.size} selected
        </span>
      </div>

      <label
        htmlFor={`${idPrefix}-search`}
        className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {searchLabel}
      </label>
      <input
        id={`${idPrefix}-search`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={inputClassName}
        placeholder={`Search ${legend.toLowerCase()}`}
      />

      <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {items.map((item) => {
          const isVisible = item.searchText.includes(normalizedQuery);

          return (
            <label
              key={item.id}
              className={`${isVisible ? "flex" : "hidden"} cursor-pointer items-start gap-3 border-b border-zinc-100 px-3 py-3 last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900`}
            >
              <input
                type="checkbox"
                name={name}
                value={item.id}
                checked={selectedIds.has(item.id)}
                onChange={() => onToggle(item.id)}
                disabled={pending}
                className="mt-0.5 size-4 rounded border-zinc-300 accent-zinc-950"
              />
              <span className="min-w-0 text-sm">
                <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </span>
                {item.description && (
                  <span className="mt-0.5 block leading-5 text-zinc-500 dark:text-zinc-400">
                    {item.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}

        {visibleCount === 0 && (
          <p className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No matches found.
          </p>
        )}
      </div>

      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

export function OnboardingForm({
  courses,
  skills,
  initialValues,
}: {
  courses: CourseOption[];
  skills: SkillOption[];
  initialValues: InitialValues;
}) {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialOnboardingFormState,
  );
  const [selectedCourseIds, setSelectedCourseIds] = useState(
    () => new Set(initialValues.courseIds),
  );
  const [selectedSkillIds, setSelectedSkillIds] = useState(
    () => new Set(initialValues.skillIds),
  );
  const [clientErrors, setClientErrors] = useState<OnboardingFieldErrors>({});
  const errors = { ...state.errors, ...clientErrors };
  const courseItems = useMemo(
    () =>
      courses.map((course) => ({
        id: course.id,
        title: course.course_code,
        description: course.course_name,
        searchText: `${course.course_code} ${course.course_name}`.toLowerCase(),
      })),
    [courses],
  );
  const skillItems = useMemo(
    () =>
      skills.map((skill) => ({
        id: skill.id,
        title: skill.name,
        searchText: skill.name.toLowerCase(),
      })),
    [skills],
  );

  function toggleSelection(
    id: string,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) {
    setter((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function validateSelections(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors: OnboardingFieldErrors = {};

    if (selectedCourseIds.size === 0) {
      nextErrors.courses = "Select at least one current course.";
    }

    if (selectedSkillIds.size === 0) {
      nextErrors.skills = "Select at least one skill.";
    }

    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={validateSelections} className="space-y-10">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Basic information
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your student ID is private and does not indicate verification.
          </p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="fullName"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              defaultValue={initialValues.fullName}
              maxLength={FULL_NAME_MAX_LENGTH}
              required
              disabled={pending}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "full-name-error" : undefined}
              className={inputClassName}
            />
            <FieldError id="full-name-error" message={errors.fullName} />
          </div>

          <div>
            <label
              htmlFor="department"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Department
            </label>
            <select
              id="department"
              name="department"
              defaultValue={initialValues.department}
              required
              disabled={pending}
              aria-invalid={Boolean(errors.department)}
              aria-describedby={errors.department ? "department-error" : undefined}
              className={inputClassName}
            >
              <option value="" disabled>
                Choose a department
              </option>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            <FieldError id="department-error" message={errors.department} />
          </div>

          <div>
            <label
              htmlFor="studentId"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Student ID
            </label>
            <input
              id="studentId"
              name="studentId"
              type="text"
              autoComplete="off"
              defaultValue={initialValues.studentId}
              maxLength={STUDENT_ID_MAX_LENGTH}
              required
              disabled={pending}
              aria-invalid={Boolean(errors.studentId)}
              aria-describedby={errors.studentId ? "student-id-error" : "student-id-help"}
              className={inputClassName}
            />
            <p id="student-id-help" className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Stored privately for later verification.
            </p>
            <FieldError id="student-id-error" message={errors.studentId} />
          </div>

          <div>
            <label
              htmlFor="graduationYear"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Graduation year
            </label>
            <input
              id="graduationYear"
              name="graduationYear"
              type="number"
              inputMode="numeric"
              defaultValue={initialValues.graduationYear}
              min={MIN_GRADUATION_YEAR}
              max={MAX_GRADUATION_YEAR}
              step={1}
              required
              disabled={pending}
              aria-invalid={Boolean(errors.graduationYear)}
              aria-describedby={
                errors.graduationYear ? "graduation-year-error" : undefined
              }
              className={inputClassName}
            />
            <FieldError
              id="graduation-year-error"
              message={errors.graduationYear}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="bio"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Short bio <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={initialValues.bio}
              maxLength={BIO_MAX_LENGTH}
              disabled={pending}
              aria-invalid={Boolean(errors.bio)}
              aria-describedby={errors.bio ? "bio-error" : undefined}
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
            <FieldError id="bio-error" message={errors.bio} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        <SelectionList
          idPrefix="courses"
          name="courseIds"
          legend="Current courses"
          searchLabel="Search by course code or name"
          items={courseItems}
          selectedIds={selectedCourseIds}
          onToggle={(id) => toggleSelection(id, setSelectedCourseIds)}
          error={errors.courses}
          pending={pending}
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        <SelectionList
          idPrefix="skills"
          name="skillIds"
          legend="Skills"
          searchLabel="Search skills"
          items={skillItems}
          selectedIds={selectedSkillIds}
          onToggle={(id) => toggleSelection(id, setSelectedSkillIds)}
          error={errors.skills}
          pending={pending}
        />
      </section>

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
        {pending ? "Completing profile…" : "Complete profile"}
      </button>
    </form>
  );
}
