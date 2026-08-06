import { describe, expect, it } from "vitest";

import {
  countryFromLanguageTags,
  defaultStoreCountry,
  normalizeStoreCountry,
} from "@/lib/store-region";

describe("store region", () => {
  it.each([
    [["pt-BR", "pt"], "BR"],
    [["de-DE", "en-US"], "DE"],
    [["en-GB"], "GB"],
  ])("uses an explicit browser locale region", (languages, expected) => {
    expect(countryFromLanguageTags(languages)).toBe(expected);
  });

  it.each([
    { languages: ["en"] },
    { languages: ["invalid_locale"] },
    { languages: [] },
  ])(
    "does not infer a country from $languages",
    ({ languages }) => {
      expect(countryFromLanguageTags(languages)).toBeNull();
    },
  );

  it("normalizes valid countries and falls back to the US", () => {
    expect(normalizeStoreCountry(" br ")).toBe("BR");
    expect(normalizeStoreCountry("USA")).toBe(defaultStoreCountry);
    expect(normalizeStoreCountry(null)).toBe(defaultStoreCountry);
  });
});
