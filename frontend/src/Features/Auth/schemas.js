import { z } from "zod";

import { INDIAN_STATES } from "../../Data/indianStates";

// Mirrors the API's rules so most mistakes are caught before submitting;
// the API remains the authority and its messages are shown too.

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .email("Enter a valid email address");

const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters");

const phonePattern = /^\+?[\d\s-]{10,16}$/;
const phone = z.string().trim().regex(phonePattern, "Enter a valid phone number, e.g. 97313 07237");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(120),
  email,
  phone: z.union([z.literal(""), phone]),
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ new_password: newPassword, confirm_password: z.string() })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords don't match",
  });

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: newPassword,
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords don't match",
  });

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(120),
  phone: z.union([z.literal(""), phone]),
});

export const addressSchema = z.object({
  label: z.string().trim().max(30),
  full_name: z.string().trim().min(1, "Enter the recipient's name").max(120),
  phone,
  line1: z.string().trim().min(1, "Enter the house/flat and street").max(200),
  line2: z.string().trim().max(200),
  landmark: z.string().trim().max(120),
  city: z.string().trim().min(1, "Enter the city").max(80),
  state: z.enum(INDIAN_STATES, { message: "Choose a state" }),
  pincode: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode")),
});
