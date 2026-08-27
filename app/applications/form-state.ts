export type WithdrawApplicationFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialWithdrawApplicationFormState: WithdrawApplicationFormState =
  {
    status: "idle",
  };
