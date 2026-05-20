import { z } from "zod";
import { parseISODate } from "./dates";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Profile field building blocks ─────────────────────────────
const nameField = z
  .string()
  .trim()
  .min(1, "Required")
  .max(60, "Keep it under 60 characters");

export const genderEnum = z.enum(["male", "female"]);
export type Gender = z.infer<typeof genderEnum>;

const MIN_DOB = parseISODate("1900-01-01");

const dobField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
  .refine(
    (s) => {
      const d = parseISODate(s);
      if (Number.isNaN(d.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d > today) return false;
      if (d < MIN_DOB) return false;
      return true;
    },
    { message: "Pick a date between 1900 and today" },
  )
  .refine(
    (s) => {
      const dob = parseISODate(s);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age >= 13;
    },
    { message: "You must be at least 13 years old" },
  );

// ── Signup: email + password + four profile fields ───────────
export const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    firstName: nameField,
    lastName: nameField,
    gender: genderEnum,
    dateOfBirth: dobField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type SignupInput = z.infer<typeof signupSchema>;

// ── Profile edit (no email/password) ─────────────────────────
export const profileSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  gender: genderEnum,
  dateOfBirth: dobField,
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z
    .number({ invalid_type_error: "Enter an amount" })
    .positive("Amount must be greater than zero")
    .max(99_999_999.99, "That's a lot — split it into smaller entries?"),
  categoryId: z.string().uuid("Pick a category"),
  note: z
    .string()
    .max(200, "Keep notes under 200 characters")
    .optional()
    .transform((v) => (v && v.trim().length ? v.trim() : undefined)),
  spentOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
