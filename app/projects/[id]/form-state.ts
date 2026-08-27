export const APPLICATION_MESSAGE_MAX_LENGTH = 2000;

export type ApplicationFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldError?: string;
};

export const initialApplicationFormState: ApplicationFormState = {
  status: "idle",
};

export type ManageApplicationFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialManageApplicationFormState: ManageApplicationFormState = {
  status: "idle",
};

export const COMMENT_MAX_LENGTH = 2000;

export type CommentFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldError?: string;
};

export const initialCommentFormState: CommentFormState = {
  status: "idle",
};

export type ReportFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  reasonError?: string;
  detailsError?: string;
};

export const initialReportFormState: ReportFormState = {
  status: "idle",
};
