import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type SignupInput = z.infer<typeof signupSchema>;

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
