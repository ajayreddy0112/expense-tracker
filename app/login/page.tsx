"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { AuthMarketingRail } from "@/components/AuthMarketingRail";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth">
      <section className="auth-pane">
        <div className="brand">
          <div className="brand-mark">₹</div>
          <span>Spendline</span>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Welcome back
          </div>
          <h1 className="display auth-display">
            Where <span className="accent">did</span> it
            <br />
            all go?
          </h1>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              className="input"
              {...register("email")}
            />
            {errors.email && (
              <p className="field-error">{errors.email.message}</p>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              className="input"
              {...register("password")}
            />
            {errors.password && (
              <p className="field-error">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="server-error" role="alert" style={{ marginBottom: 16 }}>
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className="btn accent block"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>

          <div className="auth-fineprint">
            New here?{" "}
            <Link href="/signup">Create an account →</Link>
          </div>
        </form>

        <div className="auth-foot">
          Your expenses are yours alone — encrypted at rest, never shared, never sold.
        </div>
      </section>

      <AuthMarketingRail />
    </main>
  );
}
