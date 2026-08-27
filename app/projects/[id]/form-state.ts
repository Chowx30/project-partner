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
