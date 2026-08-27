"use server";

import { revalidatePath } from "next/cache";

import {
  APPLICATION_MESSAGE_MAX_LENGTH,
  type ApplicationFormState,
  COMMENT_MAX_LENGTH,
  type CommentFormState,
  type ManageApplicationFormState,
} from "@/app/projects/[id]/form-state";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import { isUuid } from "@/src/lib/profile/validation";
import { createClient } from "@/src/lib/supabase/server";

function formError(message: string): ApplicationFormState {
  return { status: "error", message };
}

function rpcErrorState(message: string): ApplicationFormState {
  switch (message) {
    case "authentication_required":
      return formError("Please log in again.");
    case "ineligible_account":
      return formError("Only eligible NSU student accounts can apply.");
    case "onboarding_required":
      return formError("Please complete onboarding before applying.");
    case "invalid_application_message":
      return {
        status: "error",
        fieldError: "Your application message is too long.",
      };
    case "project_not_found":
      return formError("This project could not be found.");
    case "project_not_open":
      return formError("This project is no longer accepting applications.");
    case "cannot_apply_to_own_project":
      return formError("You cannot apply to your own project.");
    case "already_project_member":
      return formError("You are already a member of this project.");
    case "application_already_exists":
      return formError("You have already applied to this project.");
    case "project_full":
      return formError("This project has already filled its available spots.");
    default:
      return formError("Could not submit your application. Please try again.");
  }
}

function manageError(message: string): ManageApplicationFormState {
  return { status: "error", message };
}

function acceptRpcErrorState(message: string): ManageApplicationFormState {
  switch (message) {
    case "authentication_required":
      return manageError("Please log in again.");
    case "ineligible_account":
      return manageError(
        "Only eligible NSU student accounts can manage applications.",
      );
    case "application_not_found":
      return manageError("This application could not be found.");
    case "application_not_pending":
      return manageError("This application has already been handled.");
    case "project_not_open":
      return manageError("This project is no longer open for new members.");
    case "already_project_member":
      return manageError("This student is already a project member.");
    case "project_full":
      return manageError("This project has already filled its available spots.");
    default:
      return manageError("Could not accept this application. Please try again.");
  }
}

function rejectRpcErrorState(message: string): ManageApplicationFormState {
  switch (message) {
    case "authentication_required":
      return manageError("Please log in again.");
    case "ineligible_account":
      return manageError(
        "Only eligible NSU student accounts can manage applications.",
      );
    case "application_not_found":
      return manageError("This application could not be found.");
    case "application_not_pending":
      return manageError("This application has already been handled.");
    default:
      return manageError("Could not reject this application. Please try again.");
  }
}

function commentError(message: string): CommentFormState {
  return { status: "error", message };
}

function commentContentError(): CommentFormState {
  return {
    status: "error",
    fieldError: `Comment must be between 1 and ${COMMENT_MAX_LENGTH} characters.`,
  };
}

function createCommentRpcErrorState(message: string): CommentFormState {
  switch (message) {
    case "authentication_required":
      return commentError("Please log in again.");
    case "ineligible_account":
      return commentError("Only eligible NSU student accounts can comment.");
    case "onboarding_required":
      return commentError("Please complete onboarding before commenting.");
    case "invalid_comment_content":
      return commentContentError();
    case "project_not_found":
      return commentError("This project could not be found.");
    case "project_comments_closed":
      return commentError("Comments are closed for this project.");
    default:
      return commentError("Could not post your comment. Please try again.");
  }
}

function validatedCommentContent(formData: FormData) {
  const rawContent = formData.get("content");
  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  const contentLength = Array.from(content).length;

  if (contentLength < 1 || contentLength > COMMENT_MAX_LENGTH) {
    return null;
  }

  return content;
}

export async function createProjectCommentAction(
  projectId: string,
  _previousState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  void _previousState;

  await requireCompletedProfile();

  if (!isUuid(projectId)) {
    return commentError("This project could not be found.");
  }

  const content = validatedCommentContent(formData);

  if (!content) {
    return commentContentError();
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_project_comment", {
    p_project_id: projectId,
    p_content: content,
  });

  if (error) {
    return createCommentRpcErrorState(error.message);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");

  return { status: "success", message: "Comment posted." };
}

export async function editProjectCommentAction(
  commentId: string,
  _previousState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  void _previousState;

  const { user } = await requireCompletedProfile();

  if (!isUuid(commentId)) {
    return commentError("Could not update this comment.");
  }

  const content = validatedCommentContent(formData);

  if (!content) {
    return commentContentError();
  }

  const supabase = await createClient();
  const commentResult = await supabase
    .from("comments")
    .update({ content })
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select("project_id")
    .maybeSingle();

  if (commentResult.error) {
    return commentError("Could not update this comment.");
  }

  if (
    !commentResult.data ||
    !isUuid(commentResult.data.project_id)
  ) {
    return commentError("Could not update this comment.");
  }

  revalidatePath(`/projects/${commentResult.data.project_id}`);

  return { status: "success", message: "Comment updated." };
}

export async function deleteProjectCommentAction(
  commentId: string,
  _previousState: CommentFormState,
  _formData: FormData,
): Promise<CommentFormState> {
  void _previousState;
  void _formData;

  const { user } = await requireCompletedProfile();

  if (!isUuid(commentId)) {
    return commentError("Could not delete this comment.");
  }

  const supabase = await createClient();
  const commentResult = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select("project_id")
    .maybeSingle();

  if (commentResult.error) {
    return commentError("Could not delete this comment.");
  }

  if (
    !commentResult.data ||
    !isUuid(commentResult.data.project_id)
  ) {
    return commentError("Could not delete this comment.");
  }

  revalidatePath(`/projects/${commentResult.data.project_id}`);

  return { status: "success", message: "Comment deleted." };
}

export async function submitProjectApplicationAction(
  projectId: string,
  _previousState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  await requireCompletedProfile();

  if (!isUuid(projectId)) {
    return formError("This project could not be found.");
  }

  const rawMessage = formData.get("message");
  const trimmedMessage =
    typeof rawMessage === "string" ? rawMessage.trim() : "";
  const message = trimmedMessage.length > 0 ? trimmedMessage : null;

  if (
    message !== null &&
    message.length > APPLICATION_MESSAGE_MAX_LENGTH
  ) {
    return {
      status: "error",
      fieldError: "Your application message is too long.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_project_application", {
    p_project_id: projectId,
    p_message: message,
  });

  if (error) {
    return rpcErrorState(error.message);
  }

  revalidatePath(`/projects/${projectId}`);

  return {
    status: "success",
    message: "Application submitted.",
  };
}

export async function acceptProjectApplicationAction(
  applicationId: string,
  _previousState: ManageApplicationFormState,
  _formData: FormData,
): Promise<ManageApplicationFormState> {
  void _previousState;
  void _formData;

  await requireCompletedProfile();

  if (!isUuid(applicationId)) {
    return manageError("This application could not be found.");
  }

  const supabase = await createClient();
  const applicationResult = await supabase
    .from("applications")
    .select("project_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationResult.error) {
    return manageError("Could not accept this application. Please try again.");
  }

  if (
    !applicationResult.data ||
    !isUuid(applicationResult.data.project_id)
  ) {
    return manageError("This application could not be found.");
  }

  const { error } = await supabase.rpc("accept_project_application", {
    p_application_id: applicationId,
  });

  if (error) {
    return acceptRpcErrorState(error.message);
  }

  revalidatePath(`/projects/${applicationResult.data.project_id}`);

  return {
    status: "success",
    message: "Application accepted.",
  };
}

export async function rejectProjectApplicationAction(
  applicationId: string,
  _previousState: ManageApplicationFormState,
  _formData: FormData,
): Promise<ManageApplicationFormState> {
  void _previousState;
  void _formData;

  await requireCompletedProfile();

  if (!isUuid(applicationId)) {
    return manageError("This application could not be found.");
  }

  const supabase = await createClient();
  const applicationResult = await supabase
    .from("applications")
    .select("project_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationResult.error) {
    return manageError("Could not reject this application. Please try again.");
  }

  if (
    !applicationResult.data ||
    !isUuid(applicationResult.data.project_id)
  ) {
    return manageError("This application could not be found.");
  }

  const { error } = await supabase.rpc("reject_project_application", {
    p_application_id: applicationId,
  });

  if (error) {
    return rejectRpcErrorState(error.message);
  }

  revalidatePath(`/projects/${applicationResult.data.project_id}`);

  return {
    status: "success",
    message: "Application rejected.",
  };
}
