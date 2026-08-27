export type NotificationActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialNotificationActionState: NotificationActionState = {
  status: "idle",
};
