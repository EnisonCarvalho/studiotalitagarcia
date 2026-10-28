import { describe, expect, it } from "vitest";
import {
  INSTAGRAM_URL, LOGO, WHATSAPP_NUMBER, gallery, photos, serviceMessage, services, whatsappLink,
} from "@/content/site";

describe("whatsappLink", () => {
  it("uses the studio number and encodes accents", () => {
    const url = whatsappLink(serviceMessage("cílios"));
    expect(url.startsWith("https://wa.me/5585933005196?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1] ?? "")).toContain("procedimentos de cílios");
    expect(url).not.toContain(" ");
  });

  it("keeps the studio number for every booking button", () => {
    expect(WHATSAPP_NUMBER).toBe("5585933005196");
  });
});

describe("contact links", () => {
  it("points Instagram to the official profile", () => {
    expect(INSTAGRAM_URL).toBe("https://www.instagram.com/studio_talitagarcia/");
  });

  it("shows Talita's photo and the studio space photo", () => {
    expect(photos.portrait.src).toBe("/__l5e/assets-v1/11e460d1-542a-40ec-8fbb-aca7bf8cbb25/talita-retrato.jpg");
    expect(photos.space.src).toBe("/__l5e/assets-v1/e1c1e8d0-3c44-4f11-b353-c8fd590caa6b/studio-espaco.jpg");
  });
});

describe("real service photos", () => {
  it("shows the uploaded photo on each of the four services", () => {
    expect(services.find((s) => s.id === "cilios")?.photo.src).toContain("cilios.jpg");
    expect(services.find((s) => s.id === "sobrancelhas")?.photo.src).toContain("sobrancelhas.png");
    expect(services.find((s) => s.id === "unhas")?.photo.src).toContain("unhas.jpg");
    expect(services.find((s) => s.id === "depilacao")?.photo.src).toContain("depilacao.jpg");
  });

  it("fills the results gallery with real photos", () => {
    for (const item of gallery) expect(item.src).toBeTruthy();
    expect(gallery.map((g) => g.category).sort()).toEqual(["Cílios", "Depilação", "Sobrancelhas", "Unhas"]);
  });

  it("uses the rose gold logo", () => {
    expect(LOGO).toContain("logo.png");
  });
});
