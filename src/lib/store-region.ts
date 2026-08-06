export const defaultStoreCountry = "US";

export function normalizeStoreCountry(value: string | null | undefined): string {
  const country = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(country) ? country : defaultStoreCountry;
}

export function countryFromLanguageTags(
  languageTags: readonly string[],
): string | null {
  for (const languageTag of languageTags) {
    try {
      const region = new Intl.Locale(languageTag).region?.toUpperCase();
      if (region && /^[A-Z]{2}$/.test(region)) {
        return region;
      }
    } catch {
      continue;
    }
  }

  return null;
}
