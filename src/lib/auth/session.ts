import { isNsuEmail, normalizeEmail } from "@/src/lib/auth/validation";
import { createClient } from "@/src/lib/supabase/server";

export type AuthenticatedUser = {
  email: string;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  const claims = data.claims as Record<string, unknown>;
  const email = claims.email;

  if (
    typeof email !== "string" ||
    claims.is_anonymous !== false ||
    !isNsuEmail(email)
  ) {
    return null;
  }

  return { email: normalizeEmail(email) };
}
