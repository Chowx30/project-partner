"use server";

import { revalidatePath } from "next/cache";

import type { NotificationActionState } from "@/app/notifications/form-state";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import { isUuid } from "@/src/lib/profile/validation";
import { createClient } from "@/src/lib/supabase/server";

function actionError(message: string): NotificationActionState {
  return { status: "error", message };
}

function revalidateNotificationViews() {
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markNotificationRead(
  notificationId: string,
  _previousState: NotificationActionState,
  _formData: FormData,
): Promise<NotificationActionState> {
  void _previousState;
  void _formData;

  const { user } = await requireCompletedProfile();

  if (!isUuid(notificationId)) {
    return actionError("This notification could not be updated.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return actionError(
      "Could not mark this notification as read. Please try again.",
    );
  }

  revalidateNotificationViews();

  return { status: "success", message: "Notification marked as read." };
}

export async function markAllNotificationsRead(
  _previousState: NotificationActionState,
  _formData: FormData,
): Promise<NotificationActionState> {
  void _previousState;
  void _formData;

  const { user } = await requireCompletedProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return actionError(
      "Could not mark notifications as read. Please try again.",
    );
  }

  revalidateNotificationViews();

  return { status: "success", message: "All notifications marked as read." };
}
