"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { ReceiptIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/lib/toasts"

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const callbackUrl = useMemo(() => {
    const cb = searchParams.get("callbackUrl")
    return cb ?? "/dashboard"
  }, [searchParams])

  const oauthError = searchParams.get("error")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = email.trim()
    if (!trimmed || !password) {
      toast.error("Enter your email and password.")
      return
    }

    setLoading(true)
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: trimmed,
        password,
        callbackUrl,
      })

      if (result?.error) {
        toast.error("Invalid credentials. Please try again.")
        return
      }

      toast.success("Welcome back!")
      router.push(callbackUrl.startsWith("/") ? callbackUrl : "/dashboard")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/15 bg-background/70 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/55">
      <CardHeader className="space-y-2">
        <div className="mb-5 flex justify-center md:justify-start">
          <div className="inline-flex items-center gap-3 rounded-xl border border-border/60 bg-muted/35 px-3 py-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-4 ring-ring/35">
              <ReceiptIcon aria-hidden className="size-[18px]" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">QuickBill</div>
              <div className="text-muted-foreground text-xs font-medium">Retail POS Suite</div>
            </div>
          </div>
        </div>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>Use your workspace credentials to continue.</CardDescription>

        {(oauthError === "Configuration" ||
          oauthError === "OAuthSignin" ||
          oauthError === "OAuthCallback") && (
          <p className="text-destructive text-sm font-medium">
            Authentication misconfiguration. Confirm environment variables are set.
          </p>
        )}
        {oauthError === "CredentialsSignin" && (
          <p className="text-muted-foreground text-sm">
            Please check your credentials and try again.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder="you@shop.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              aria-invalid={
                oauthError === "CredentialsSignin" ||
                oauthError === "OAuthSignin" ||
                undefined
              }
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <span className="text-muted-foreground text-xs font-medium">
                Workspace account
              </span>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={loading}
            />
          </div>

          <Button className="h-11 w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Protected area. Unauthorized access attempts may be audited. Questions? Reach your
            admin for an account reset.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export function LoginForm() {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground text-sm">Loading...</div>}
    >
      <LoginInner />
    </Suspense>
  )
}
