import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const LOGIN = "/login"
const DASHBOARD = "/dashboard"

function getSecret() {
  return process.env.NEXTAUTH_SECRET
}

export async function middleware(req: NextRequest) {
  const secret = getSecret()
  const { pathname } = req.nextUrl

  if (!secret) {
    console.error("[auth] NEXTAUTH_SECRET is not set.")
    if (pathname === LOGIN) {
      return NextResponse.next()
    }
    const url = new URL(LOGIN, req.url)
    url.searchParams.set("error", "Configuration")
    return NextResponse.redirect(url)
  }

  const token = await getToken({ req, secret })
  const isLogin = pathname === LOGIN

  if (isLogin) {
    const error = req.nextUrl.searchParams.get("error")
    if ((error === "SessionRequired" || error === "CredentialsSignin") && token) {
      const cleaned = req.nextUrl.clone()
      cleaned.searchParams.delete("error")
      return NextResponse.redirect(cleaned)
    }

    if (token) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl")
      let target = DASHBOARD
      if (callbackUrl) {
        try {
          const candidate = new URL(callbackUrl, req.url)
          if (
            candidate.origin === req.nextUrl.origin &&
            (candidate.pathname === "/" ||
              candidate.pathname.startsWith(`${DASHBOARD}/`) ||
              candidate.pathname === DASHBOARD)
          ) {
            target = `${candidate.pathname}${candidate.search}`
          }
        } catch {
          // ignore malformed callback URLs
        }
      }
      return NextResponse.redirect(new URL(target, req.url))
    }
    return NextResponse.next()
  }

  if (!token) {
    const url = new URL(LOGIN, req.url)
    const cb = `${pathname}${req.nextUrl.search}`
    url.searchParams.set("callbackUrl", cb)
    return NextResponse.redirect(url)
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(DASHBOARD, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
