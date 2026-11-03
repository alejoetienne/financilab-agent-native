import { describe, expect, it } from "vitest";

import { DEMO_CASES } from "../server/lib/demo-cases";
import { detectLanguage, resolveLang } from "../server/lib/language";

describe("detectLanguage", () => {
  it("detects Spanish messages, with or without accents", () => {
    expect(
      detectLanguage(
        "Banpro le informa: hemos detectado un intento de acceso. Responda este mensaje con el código OTP.",
      ),
    ).toBe("es");
    expect(detectLanguage("Felicidades gano un premio, deposite para reclamar su premio")).toBe("es");
  });

  it("detects English messages", () => {
    expect(
      detectLanguage(
        "Your PayPal account has been limited. Confirm your identity within 24 hours to avoid permanent suspension.",
      ),
    ).toBe("en");
  });

  it("ignores URLs and emails when counting words", () => {
    expect(
      detectLanguage("Su cuenta: https://the-bank-of-your-account.com/verify-the-code-for-you"),
    ).toBe("es");
  });

  it("falls back to Spanish for empty or ambiguous text", () => {
    expect(detectLanguage("")).toBe("es");
    expect(detectLanguage(null)).toBe("es");
    expect(detectLanguage("OK 12345")).toBe("es");
  });

  it("classifies the demo cases (all Spanish except the PayPal email)", () => {
    for (const c of DEMO_CASES) {
      const expected = /PayPal account/.test(c.text) ? "en" : "es";
      expect(detectLanguage(c.text), c.text).toBe(expected);
    }
  });
});

describe("resolveLang", () => {
  it("honours an explicit override and detects for auto/undefined", () => {
    const en = "Your account is blocked, click here to verify";
    expect(resolveLang("es", en)).toBe("es");
    expect(resolveLang("auto", en)).toBe("en");
    expect(resolveLang(undefined, "Su cuenta está bloqueada")).toBe("es");
  });
});
