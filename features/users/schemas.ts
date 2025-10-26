import { z } from "zod";

const ROLE_OPTIONS = ["admin", "manager", "staff"] as const;

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Email is invalid");

export const createUserSchema = z.object({
  email: emailSchema,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name is too long"),
  phone: z
    .string()
    .trim()
    .min(3, "Phone number is too short")
    .max(30, "Phone number is too long"),
  role: z.enum(ROLE_OPTIONS),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password is too long"),
});

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(120, "Name is too long")
      .optional(),
    phone: z
      .union([
        z
          .string()
          .trim()
          .min(3, "Phone number is too short")
          .max(30, "Phone number is too long"),
        z.literal(""),
      ])
      .optional(),
    role: z.enum(ROLE_OPTIONS).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (payload) =>
      Object.keys(payload).length > 0 &&
      Object.values(payload).some((value) => value !== undefined),
    {
      message: "No changes provided",
      path: [],
    },
  );

export const resetPasswordSchema = z.object({
  redirectTo: z
    .string()
    .url("redirectTo must be a valid URL")
    .optional(),
});

export const profileUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(120, "Name is too long")
      .optional(),
    email: emailSchema.optional(),
    phone: z
      .string()
      .trim()
      .min(3, "Phone number is too short")
      .max(30, "Phone number is too long")
      .optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password is too long")
      .optional(),
    avatar: z
      .union([z.string().url("Avatar must be a valid URL"), z.literal("")])
      .optional(),
  })
  .refine(
    (payload) =>
      Object.keys(payload).length > 0 &&
      Object.values(payload).some((value) =>
        typeof value === "string" ? value.trim().length > 0 : value !== undefined,
      ),
    {
      message: "No changes provided",
      path: [],
    },
  );

export type CreateUserPayload = z.infer<typeof createUserSchema>;
export type UpdateUserPayload = z.infer<typeof updateUserSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;
