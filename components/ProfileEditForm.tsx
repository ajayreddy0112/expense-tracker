"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput, type Gender } from "@/lib/schemas";
import { updateProfile } from "@/app/dashboard/profile/actions";
import { fmtISODate } from "@/lib/dates";
import type { Profile } from "@/lib/types";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
];

export function ProfileEditForm({ initial }: { initial: Profile | null }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const todayISO = fmtISODate(new Date());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initial?.first_name ?? "",
      lastName: initial?.last_name ?? "",
      gender: (initial?.gender as Gender | undefined) ?? "male",
      dateOfBirth: initial?.date_of_birth ?? "",
    },
  });

  const gender = watch("gender");

  useEffect(() => {
    register("gender");
  }, [register]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2400);
    return () => clearTimeout(t);
  }, [savedAt]);

  function onSubmit(values: ProfileInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      reset(values);
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <form className="card" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        Your details
      </div>

      <div className="row-2" style={{ marginBottom: 14 }}>
        <div>
          <label htmlFor="pf-first" className="label">
            First name
          </label>
          <input
            id="pf-first"
            type="text"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            className="input"
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="field-error">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="pf-last" className="label">
            Last name
          </label>
          <input
            id="pf-last"
            type="text"
            autoComplete="family-name"
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
                  setValue("gender", g.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
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
          <label htmlFor="pf-dob" className="label">
            Date of birth
          </label>
          <input
            id="pf-dob"
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

      {serverError && (
        <div className="server-error" role="alert" style={{ marginBottom: 12 }}>
          {serverError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span className="dim sm">
          {savedAt ? "Saved." : isDirty ? "Unsaved changes" : ""}
        </span>
        <button
          type="submit"
          className="btn accent"
          disabled={pending || !isDirty}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
