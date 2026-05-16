import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center px-6 py-10 md:justify-end md:py-14 lg:justify-center lg:py-24">
      <div className="relative w-full max-w-md lg:translate-x-[4%]">
        <LoginForm />
      </div>
    </div>
  )
}
