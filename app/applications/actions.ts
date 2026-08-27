"use server";

import { revalidatePath } from "next/cache";

import type { WithdrawApplicationFormState } from "@/app/applications/form-state";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import { isUuid } from "@/src/lib/profile/validation";
import { createClient } from "@/src/lib/supabase/server";

function withdrawError(message: string): WithdrawApplicationFormState {
  return { status: "error", message };
}

export async function withdrawApplication(
  applicationId: string,
  _previousState: WithdrawApplicationFormState,
  _formData: FormData,
): Promise<WithdrawApplicationFormState> {
  void _previousState;
  void _formData;

  const { user } = await requireCompletedProfile();

  if (!isUuid(applicationId)) {
    return withdrawError("This application could not be found.");
  }

  const supabase = await createClient();
  const applicationResult = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("applicant_id", user.id)
    .eq("status", "pending")
    .select("project_id")
    .maybeSingle();

  if (applicationResult.error) {
    return withdrawError(
      "Could not withdraw this application. Please try again.",
    );
  }

  if (!applicationResult.data) {
    return withdrawError("This application is no longer available to withdraw.");
  }

  revalidatePath("/applications");

  if (isUuid(applicationResult.data.project_id)) {
    revalidatePath(`/projects/${applicationResult.data.project_id}`);
  }

  return {
    status: "success",
    message: "Application withdrawn.",
  };
}
