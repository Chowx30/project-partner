import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function createResponse(request: NextRequest, forwardedHeaders?: Headers) {
  if (!forwardedHeaders) {
    return NextResponse.next({ request });
  }

  const requestHeaders = new Headers(forwardedHeaders);
  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  } else {
    requestHeaders.delete("cookie");
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function updateSession(
  request: NextRequest,
  forwardedHeaders?: Headers,
) {
  let response = createResponse(request, forwardedHeaders);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          response = createResponse(request, forwardedHeaders);

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  await supabase.auth.getClaims();

  return response;
}
