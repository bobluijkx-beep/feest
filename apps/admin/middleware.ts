import { NextResponse, type NextRequest } from "next/server";
// Let op: bewust een subpath-import, niet de @lions/core-barrel. Middleware draait in
// de Edge-runtime, die geen node:crypto/Prisma-engine ondersteunt — die zitten wél in de
// rest van @lions/core (settings-encryptie, checkout, db). Alleen deze functie is
// edge-safe.
import { createServerSupabaseClient } from "@lions/core/auth/supabase-server";

// Ververst de Supabase-sessie op elk request en stuurt niet-ingelogde bezoekers naar
// /login. De echte RBAC-grens zit in requireRole() per pagina/Server Action — dit is
// alleen de coarse "ben je uberhaupt ingelogd"-check.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as never));
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
