export type CreateProjectFieldErrors = {
  postType?: string;
  courseId?: string;
  title?: string;
  description?: string;
  membersNeeded?: string;
};

export type CreateProjectFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: CreateProjectFieldErrors;
};

export const initialCreateProjectFormState: CreateProjectFormState = {
  status: "idle",
};
