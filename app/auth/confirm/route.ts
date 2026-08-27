import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { isNsuEmail } from "@/src/lib/auth/validation";
import { createClient } from "@/src/lib/supabase/server";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && OTP_TYPES.has(value);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const loginUrl = new URL("/login", request.url);

  if (!tokenHash || !isEmailOtpType(type)) {
    loginUrl.searchParams.set("error", "confirmation_failed");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    loginUrl.searchParams.set("error", "confirmation_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (!data.user?.email || !isNsuEmail(data.user.email)) {
    await supabase.auth.signOut({ scope: "local" });
    loginUrl.searchParams.set("error", "nsu_email_required");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
