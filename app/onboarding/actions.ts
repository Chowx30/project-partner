"use server";

import { redirect } from "next/navigation";

import type {
  OnboardingFieldErrors,
  OnboardingFormState,
} from "@/app/onboarding/form-state";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { getOnboardingSnapshot } from "@/src/lib/profile/data";
import {
  BIO_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  isDepartment,
  isUuid,
  MAX_GRADUATION_YEAR,
  MIN_GRADUATION_YEAR,
  STUDENT_ID_MAX_LENGTH,
} from "@/src/lib/profile/validation";
import { createClient } from "@/src/lib/supabase/server";

const MAX_CATALOG_SELECTIONS = 100;

function readFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readUniqueIds(formData: FormData, name: string) {
  return [
    ...new Set(
      formData
        .getAll(name)
        .filter((value): value is string => typeof value === "string"),
    ),
  ];
}

function databaseError(message: string): OnboardingFormState {
  return { status: "error", message };
}

function rpcErrorState(message: string): OnboardingFormState {
  switch (message) {
    case "student_id_already_used":
      return {
        status: "error",
        errors: {
          studentId: "This student ID is already associated with an account.",
        },
      };
    case "invalid_course_selection":
      return {
        status: "error",
        errors: { courses: "Please choose valid current courses." },
      };
    case "invalid_skill_selection":
      return {
        status: "error",
        errors: { skills: "Please choose valid skills." },
      };
    case "invalid_full_name":
      return {
        status: "error",
        errors: {
          fullName: `Full name must be between 1 and ${FULL_NAME_MAX_LENGTH} characters.`,
        },
      };
    case "invalid_department":
      return {
        status: "error",
        errors: { department: "Choose CSE or EEE." },
      };
    case "invalid_student_id":
      return {
        status: "error",
        errors: {
          studentId: `Student ID must be between 1 and ${STUDENT_ID_MAX_LENGTH} characters.`,
        },
      };
    case "invalid_graduation_year":
      return {
        status: "error",
        errors: {
          graduationYear: `Graduation year must be between ${MIN_GRADUATION_YEAR} and ${MAX_GRADUATION_YEAR}.`,
        },
      };
    case "invalid_bio":
      return {
        status: "error",
        errors: { bio: `Bio must be ${BIO_MAX_LENGTH} characters or fewer.` },
      };
    case "ineligible_account":
      return databaseError("This account is not eligible to complete onboarding.");
    case "verified_student_id_mismatch":
      return {
        status: "error",
        errors: { studentId: "A verified student ID cannot be changed." },
      };
    case "onboarding_failed":
    default:
      return databaseError(
        "Something went wrong while setting up your profile. Please try again.",
      );
  }
}

export async function completeOnboardingAction(
  _previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  let snapshot;

  try {
    snapshot = await getOnboardingSnapshot(user.id);
  } catch {
    return databaseError(
      "We could not load your current profile. Please try again.",
    );
  }

  if (snapshot.isComplete) {
    redirect("/dashboard");
  }

  const fullName = readFormValue(formData, "fullName").trim();
  const department = readFormValue(formData, "department")
    .trim()
    .toUpperCase();
  const studentId = readFormValue(formData, "studentId").trim();
  const graduationYearValue = readFormValue(
    formData,
    "graduationYear",
  ).trim();
  const graduationYear = Number(graduationYearValue);
  const rawBio = readFormValue(formData, "bio").trim();
  const bio = rawBio.length > 0 ? rawBio : null;
  const courseIds = readUniqueIds(formData, "courseIds");
  const skillIds = readUniqueIds(formData, "skillIds");
  const errors: OnboardingFieldErrors = {};

  if (fullName.length === 0 || fullName.length > FULL_NAME_MAX_LENGTH) {
    errors.fullName = `Full name must be between 1 and ${FULL_NAME_MAX_LENGTH} characters.`;
  }

  if (!isDepartment(department)) {
    errors.department = "Choose CSE or EEE.";
  }

  if (studentId.length === 0 || studentId.length > STUDENT_ID_MAX_LENGTH) {
    errors.studentId = `Student ID must be between 1 and ${STUDENT_ID_MAX_LENGTH} characters.`;
  }

  if (
    !/^\d{4}$/.test(graduationYearValue) ||
    !Number.isInteger(graduationYear) ||
    graduationYear < MIN_GRADUATION_YEAR ||
    graduationYear > MAX_GRADUATION_YEAR
  ) {
    errors.graduationYear = `Graduation year must be between ${MIN_GRADUATION_YEAR} and ${MAX_GRADUATION_YEAR}.`;
  }

  if (bio !== null && bio.length > BIO_MAX_LENGTH) {
    errors.bio = `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`;
  }

  if (
    courseIds.length === 0 ||
    courseIds.length > MAX_CATALOG_SELECTIONS ||
    courseIds.some((id) => !isUuid(id))
  ) {
    errors.courses = "Select at least one valid current course.";
  }

  if (
    skillIds.length === 0 ||
    skillIds.length > MAX_CATALOG_SELECTIONS ||
    skillIds.some((id) => !isUuid(id))
  ) {
    errors.skills = "Select at least one valid skill.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const supabase = await createClient();
  const [courseCatalogResult, skillCatalogResult] = await Promise.all([
    supabase.from("courses").select("id").in("id", courseIds),
    supabase.from("skills").select("id").in("id", skillIds),
  ]);

  if (courseCatalogResult.error || skillCatalogResult.error) {
    return databaseError(
      "We could not validate your selections. Please try again.",
    );
  }

  if (courseCatalogResult.data.length !== courseIds.length) {
    return {
      status: "error",
      errors: { courses: "One or more selected courses are unavailable." },
    };
  }

  if (skillCatalogResult.data.length !== skillIds.length) {
    return {
      status: "error",
      errors: { skills: "One or more selected skills are unavailable." },
    };
  }

  const { error: rpcError } = await supabase.rpc("complete_onboarding", {
    p_full_name: fullName,
    p_department: department,
    p_student_id: studentId,
    p_graduation_year: graduationYear,
    p_bio: bio,
    p_course_ids: courseIds,
    p_skill_ids: skillIds,
  });

  if (rpcError?.message === "authentication_required") {
    redirect("/login");
  }

  if (rpcError?.message === "onboarding_already_complete") {
    redirect("/dashboard");
  }

  if (rpcError) {
    return rpcErrorState(rpcError.message);
  }

  redirect("/dashboard");
}
