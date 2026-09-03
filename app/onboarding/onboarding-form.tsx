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
import { Button } from "@/src/components/ui/button";
import {
  errorTextStyles,
  helpTextStyles,
  inputStyles,
  labelStyles,
  selectStyles,
  textareaStyles,
} from "@/src/components/ui/form-controls";

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
  number: string;
  idPrefix: string;
  name: "courseIds" | "skillIds";
  legend: string;
  description: string;
  searchLabel: string;
  items: CatalogItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  error?: string;
  pending: boolean;
  className: string;
};

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 sm:gap-6">
      <span className="shrink-0 text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">
        {number}
      </span>
      <div>
        <h2 className="text-xl font-black tracking-tight sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className={errorTextStyles}>
      {message}
    </p>
  );
}

function SelectionList({
  number,
  idPrefix,
  name,
  legend,
  description,
  searchLabel,
  items,
  selectedIds,
  onToggle,
  error,
  pending,
  className,
}: SelectionListProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCount = items.filter((item) =>
    item.searchText.includes(normalizedQuery),
  ).length;
  const errorId = `${idPrefix}-error`;

  return (
    <fieldset
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className={`rounded-feature border-2 border-dark p-5 sm:p-7 ${className}`}
    >
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading
          number={number}
          title={legend}
          description={description}
        />
        <span className="shrink-0 rounded-full border-2 border-dark bg-dark px-3 py-1 text-xs font-bold text-white">
          {selectedIds.size} selected
        </span>
      </div>

      <label
        htmlFor={`${idPrefix}-search`}
        className={`mt-6 ${labelStyles}`}
      >
        {searchLabel}
      </label>
      <input
        id={`${idPrefix}-search`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={`mt-2 ${inputStyles}`}
        placeholder={`Search ${legend.toLowerCase()}`}
      />

      <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto rounded-card border-2 border-dark bg-white p-2 md:grid-cols-2">
        {items.map((item) => {
          const isVisible = item.searchText.includes(normalizedQuery);
          const isSelected = selectedIds.has(item.id);

          return (
            <label
              key={item.id}
              className={`${isVisible ? "flex" : "hidden"} min-h-14 cursor-pointer items-start gap-3 rounded-control border-2 border-dark px-3 py-3 transition-colors ${
                isSelected ? "bg-accent" : "bg-white hover:bg-surface"
              }`}
            >
              <input
                type="checkbox"
                name={name}
                value={item.id}
                checked={isSelected}
                onChange={() => onToggle(item.id)}
                disabled={pending}
                className="mt-0.5 size-5 shrink-0 accent-dark"
              />
              <span className="min-w-0 text-sm">
                <span className="block font-bold text-dark">
                  {item.title}
                </span>
                {item.description && (
                  <span className="mt-0.5 block leading-5 text-muted">
                    {item.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}

        {visibleCount === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted md:col-span-2">
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
    <form
      action={formAction}
      onSubmit={validateSelections}
      className="space-y-8 sm:space-y-10"
    >
      <section className="rounded-feature border-2 border-dark bg-surface p-5 shadow-card sm:p-7">
        <SectionHeading
          number="01"
          title="Basic Information"
          description="Add the academic details other students need to understand your profile."
        />

        <p className="mt-5 rounded-control border-2 border-dark bg-white px-3 py-2 text-sm text-muted">
          Your student ID is private and does not indicate verification.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className={labelStyles}>
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
              className={`mt-2 ${inputStyles}`}
            />
            <FieldError id="full-name-error" message={errors.fullName} />
          </div>

          <div>
            <label htmlFor="department" className={labelStyles}>
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
              className={`mt-2 ${selectStyles}`}
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
            <label htmlFor="studentId" className={labelStyles}>
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
              aria-describedby={
                errors.studentId ? "student-id-error" : "student-id-help"
              }
              className={`mt-2 ${inputStyles}`}
            />
            <p id="student-id-help" className={helpTextStyles}>
              Stored privately for later verification.
            </p>
            <FieldError id="student-id-error" message={errors.studentId} />
          </div>

          <div>
            <label htmlFor="graduationYear" className={labelStyles}>
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
              className={`mt-2 ${inputStyles}`}
            />
            <FieldError
              id="graduation-year-error"
              message={errors.graduationYear}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="bio" className={labelStyles}>
              Short bio <span className="font-normal text-muted">(optional)</span>
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
              className={`mt-2 ${textareaStyles}`}
            />
            <FieldError id="bio-error" message={errors.bio} />
          </div>
        </div>
      </section>

      <SelectionList
        number="02"
        idPrefix="courses"
        name="courseIds"
        legend="Current Courses"
        description="Choose the courses you are taking now."
        searchLabel="Search by course code or name"
        items={courseItems}
        selectedIds={selectedCourseIds}
        onToggle={(id) => toggleSelection(id, setSelectedCourseIds)}
        error={errors.courses}
        pending={pending}
        className="bg-white shadow-card"
      />

      <SelectionList
        number="03"
        idPrefix="skills"
        name="skillIds"
        legend="Skills"
        description="Select the skills you can bring to a team."
        searchLabel="Search skills"
        items={skillItems}
        selectedIds={selectedSkillIds}
        onToggle={(id) => toggleSelection(id, setSelectedSkillIds)}
        error={errors.skills}
        pending={pending}
        className="bg-surface"
      />

      <section className="rounded-feature border-2 border-dark bg-accent p-5 shadow-card sm:p-7">
        <SectionHeading
          number="04"
          title="Complete Profile"
          description="Review your information and finish setup."
        />

        {state.message && (
          <p
            role="alert"
            className="mt-6 rounded-control border-2 border-danger bg-white p-4 text-sm font-medium text-danger"
          >
            {state.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending}
          featured
          className="mt-7 w-full sm:w-auto sm:min-w-56"
        >
          {pending ? "Completing profile…" : "Complete Profile"}
        </Button>
      </section>
    </form>
  );
}
