"use server";

import { redirect } from "next/navigation";

import type {
  CreateProjectFieldErrors,
  CreateProjectFormState,
} from "@/app/projects/new/form-state";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import { isUuid } from "@/src/lib/profile/validation";
import {
  isProjectPostType,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_MEMBERS_MAX,
  PROJECT_MEMBERS_MIN,
  PROJECT_TITLE_MAX_LENGTH,
} from "@/src/lib/projects/validation";
import { createClient } from "@/src/lib/supabase/server";

function readFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function formError(message: string): CreateProjectFormState {
  return { status: "error", message };
}

export async function createProjectAction(
  _previousState: CreateProjectFormState,
  formData: FormData,
): Promise<CreateProjectFormState> {
  const { user } = await requireCompletedProfile();
  const postType = readFormValue(formData, "postType").trim();
  const courseId = readFormValue(formData, "courseId").trim();
  const title = readFormValue(formData, "title").trim();
  const description = readFormValue(formData, "description").trim();
  const membersNeededValue = readFormValue(
    formData,
    "membersNeeded",
  ).trim();
  const membersNeeded = Number(membersNeededValue);
  const errors: CreateProjectFieldErrors = {};

  if (!isProjectPostType(postType)) {
    errors.postType = "Choose Project Partner or Lab Partner.";
  }

  if (!isUuid(courseId)) {
    errors.courseId = "Choose a valid course.";
  }

  if (title.length === 0 || title.length > PROJECT_TITLE_MAX_LENGTH) {
    errors.title = `Title must be between 1 and ${PROJECT_TITLE_MAX_LENGTH} characters.`;
  }

  if (
    description.length === 0 ||
    description.length > PROJECT_DESCRIPTION_MAX_LENGTH
  ) {
    errors.description = `Description must be between 1 and ${PROJECT_DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (
    !/^\d+$/.test(membersNeededValue) ||
    !Number.isInteger(membersNeeded) ||
    membersNeeded < PROJECT_MEMBERS_MIN ||
    membersNeeded > PROJECT_MEMBERS_MAX
  ) {
    errors.membersNeeded = `Members needed must be between ${PROJECT_MEMBERS_MIN} and ${PROJECT_MEMBERS_MAX}.`;
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const supabase = await createClient();
  const courseResult = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseResult.error) {
    return formError("We could not validate the selected course. Please try again.");
  }

  if (!courseResult.data) {
    return {
      status: "error",
      errors: { courseId: "Choose a course from the available catalog." },
    };
  }

  const projectResult = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      course_id: courseId,
      title,
      short_description: description,
      members_needed: membersNeeded,
      post_type: postType,
    })
    .select("id")
    .single();

  if (
    projectResult.error ||
    typeof projectResult.data?.id !== "string" ||
    !isUuid(projectResult.data.id)
  ) {
    return formError("We could not create your post. Please try again.");
  }

  redirect(`/projects/${projectResult.data.id}`);
}
