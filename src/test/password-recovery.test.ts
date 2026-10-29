import { describe, expect, it } from "vitest";
import { passwordValidation, recoveryAction } from "@/lib/password-recovery";

describe("Password recovery rules", () => {
  it("requires at least eight characters", () => {
    expect(passwordValidation("abc1234", "abc1234")).not.toBeNull();
    expect(passwordValidation("abc12345", "abc12345")).toBeNull();
  });
  it("requires matching confirmation", () => {
    expect(passwordValidation("abc12345", "abc12346")).not.toBeNull();
  });
  it("does not accept failed or unrelated email actions", () => {
    expect(recoveryAction("#type=recovery&error=access_denied")).toBeNull();
    expect(recoveryAction("#type=signup")).toBeNull();
    expect(recoveryAction("#type=recovery")).toBe("recovery");
    expect(recoveryAction("#type=invite")).toBe("invite");
  });
});