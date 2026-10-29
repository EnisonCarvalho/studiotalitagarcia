import { z } from "zod";

export const adminBookingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().transform((s) => s.replace(/\D/g, "")).refine((s) => s.length >= 10 && s.length <= 13),
  email: z.union([z.literal(""), z.string().email().max(255)]),
  startsAt: z.string().datetime(),
});

export function hasVerifiedAdmin(role: boolean, confirmedAt: string | null) {
  return role && confirmedAt !== null;
}