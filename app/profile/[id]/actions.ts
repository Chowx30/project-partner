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

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_user_id: targetUserId,
    reason: validation.reason,
    details: validation.details,
  });

  if (error) {
    if (error.code === "23505") {
      return reportError("You have already reported this user.");
    }

    if (error.code === "23503") {
      return reportError("This user could not be found.");
    }

    return reportError("Could not submit this report. Please try again.");
  }

  revalidatePath(`/profile/${targetUserId}`);

  return { status: "success", message: "Report submitted." };
}
