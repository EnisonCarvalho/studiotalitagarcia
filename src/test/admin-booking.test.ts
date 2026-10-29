import { describe, expect, it } from "vitest";
import { adminBookingSchema, hasVerifiedAdmin } from "@/lib/admin-booking-schema";

describe("Administrative access", () => {
  it("does not permit admin access before email ownership is verified", () => {
    expect(hasVerifiedAdmin(true, null)).toBe(false);
    expect(hasVerifiedAdmin(true, "2026-10-29T00:00:00Z")).toBe(true);
    expect(hasVerifiedAdmin(false, "2026-10-29T00:00:00Z")).toBe(false);
  });
  it("allows an optional client email in manual scheduling", () => {
    const input = { name: "Cliente", phone: "85999990000", email: "", startsAt: "2026-11-02T11:00:00Z" };
    expect(adminBookingSchema.safeParse(input).success).toBe(true);
    expect(adminBookingSchema.safeParse({ ...input, email: "inválido" }).success).toBe(false);
  });
});