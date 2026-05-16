export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      <div className="pointer-events-none absolute -left-48 top-0 h-[38rem] w-[38rem] rounded-full bg-emerald-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-6rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 blur-[110px]" />
      <div className="relative z-10 flex min-h-svh flex-col">{children}</div>
    </div>
  )
}
