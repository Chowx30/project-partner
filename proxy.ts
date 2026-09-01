import type { NextRequest } from "next/server";

import { updateSession } from "@/src/lib/supabase/proxy";

function getSupabaseOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!configuredUrl) {
    throw new Error(
      "Server configuration error: NEXT_PUBLIC_SUPABASE_URL is required in production.",
    );
  }

  let url: URL;

  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error(
      "Server configuration error: NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL in production.",
    );
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(
      "Server configuration error: NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL in production.",
    );
  }

  return url.origin;
}

function createContentSecurityPolicy(nonce: string, supabaseOrigin: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    "img-src 'self'",
    "font-src 'self'",
    `style-src 'self' 'nonce-${nonce}'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `connect-src 'self' ${supabaseOrigin}`,
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return updateSession(request);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createContentSecurityPolicy(
    nonce,
    getSupabaseOrigin(),
  );
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
