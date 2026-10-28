import { describe, expect, it } from "vitest";
import { whatsappLink, serviceMessage } from "@/content/site";

describe("whatsappLink", () => {
  it("uses the studio number and encodes accents", () => {
    const url = whatsappLink(serviceMessage("cílios"));
    expect(url.startsWith("https://wa.me/5585933005196?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1] ?? "")).toContain("procedimentos de cílios");
    expect(url).not.toContain(" ");
  });
});
