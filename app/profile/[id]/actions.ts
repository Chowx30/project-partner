"use server";

import { revalidatePath } from "next/cache";

import { requireCompletedProfile } from "@/src/lib/profile/access";
import { isUuid } from "@/src/lib/profile/validation";
import {
  type ReportFormState,
  validateReportInput,
} from "@/src/lib/reports/validation";
import { createClient } from "@/src/lib/supabase/server";

function reportError(message: string): ReportFormState {
  return { status: "error", message };
}

function reportUserRpcErrorState(message: string): ReportFormState {
  switch (message) {
    case "rate_limit_exceeded":
      return reportError("Too many requests. Please try again later.");
    case "report_already_exists":
      return reportError("You have already reported this user.");
    case "cannot_report_own_target":
      return reportError("You cannot report yourself.");
    case "invalid_report_target":
      return reportError("This user could not be found.");
    default:
      return reportError("Could not submit this report. Please try again.");
  }
}

export async function reportUserAction(
  targetUserId: string,
  _previousState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  void _previousState;

  const { user } = await requireCompletedProfile();

  if (!isUuid(targetUserId)) {
    return reportError("This user could not be found.");
  }

  const validation = validateReportInput(formData);

  if (!validation.valid) {
    return {
      status: "error",
      reasonError: validation.reasonError,
      detailsError: validation.detailsError,
    };
  }

  const supabase = await createClient();
  const targetResult = await supabase
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetResult.error || !targetResult.data) {
    return reportError("This user could not be found.");
  }

  if (targetResult.data.id === user.id) {
    return reportError("You cannot report yourself.");
  }

  const { error } = await supabase.rpc("submit_report", {
    p_target_type: "user",
    p_target_id: targetUserId,
    p_reason: validation.reason,
    p_details: validation.details,
  });

  if (error) {
    return reportUserRpcErrorState(error.message);
  }

  revalidatePath(`/profile/${targetUserId}`);

  return { status: "success", message: "Report submitted." };
}
