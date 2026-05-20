"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signupSchema, type SignupInput, type Gender } from "@/lib/schemas";
import { fmtISODate } from "@/lib/dates";
import { AuthMarketingRail } from "@/components/AuthMarketingRail";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
];

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const todayISO = fmtISODate(new Date());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      gender: "male",
      dateOfBirth: "",
    },
  });

  const gender = watch("gender");

  useEffect(() => {
    register("gender");
  }, [register]);

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
          gender: values.gender,
          date_of_birth: values.dateOfBirth,
        },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setEmailSent(values.email);
    }
  }

  if (emailSent) {
    return (
      <main className="auth">
        <section className="auth-pane">
          <div className="brand">
            <div className="brand-mark">₹</div>
            <span>Spendline</span>
          </div>

          <div className="auth-form">
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              One last step
            </div>
            <h1 className="display auth-display">
              Check your <span className="accent">email</span>.
            </h1>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 24 }}>
              We sent a confirmation link to{" "}
              <span style={{ color: "var(--ink-900)", fontWeight: 500 }}>
                {emailSent}
              </span>
              . Click the link to verify your account, then sign in.
            </p>
            <Link href="/login" className="btn accent block">
              Back to sign in
            </Link>
          </div>

          <div className="auth-foot">
            Didn&apos;t get it? Check your spam folder, or try signing up again.
          </div>
        </section>

        <AuthMarketingRail />
      </main>
    );
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
            Make it official
          </div>
          <h1 className="display auth-display">
            Let&apos;s find out
            <br />
            <span className="accent">together</span>.
          </h1>

          <div className="row-2" style={{ marginBottom: 14 }}>
            <div>
              <label htmlFor="firstName" className="label">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="Arjun"
                aria-invalid={!!errors.firstName}
                className="input"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="field-error">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="label">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Mehta"
                aria-invalid={!!errors.lastName}
                className="input"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="field-error">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="row-2" style={{ marginBottom: 14 }}>
            <div>
              <label className="label">Gender</label>
              <div className="seg" role="group" aria-label="Gender">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    className={gender === g.value ? "on" : ""}
                    onClick={() =>
                      setValue("gender", g.value, { shouldValidate: true })
                    }
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              {errors.gender && (
                <p className="field-error">{errors.gender.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="dateOfBirth" className="label">
                Date of birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                autoComplete="bday"
                max={todayISO}
                min="1900-01-01"
                aria-invalid={!!errors.dateOfBirth}
                className="input"
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="field-error">{errors.dateOfBirth.message}</p>
              )}
            </div>
          </div>

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

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              aria-invalid={!!errors.password}
              className="input"
              {...register("password")}
            />
            {errors.password && (
              <p className="field-error">{errors.password.message}</p>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="confirmPassword" className="label">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              aria-invalid={!!errors.confirmPassword}
              className="input"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="field-error">{errors.confirmPassword.message}</p>
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
            {isSubmitting ? "Creating account…" : "Create my account"}
          </button>

          <div className="auth-fineprint">
            Already have one?{" "}
            <Link href="/login">Sign in →</Link>
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
