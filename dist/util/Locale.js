"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLanguageTag = normalizeLanguageTag;
exports.normalizeCountry = normalizeCountry;
exports.resolveAccountLocale = resolveAccountLocale;
exports.fingerprintMatchesLocale = fingerprintMatchesLocale;
function normalizeLanguageTag(value) {
    return new Intl.Locale(value.trim()).toString();
}
function normalizeCountry(value) {
    if (!value)
        return undefined;
    const normalized = value.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}
function resolveAccountLocale(account, resolvedCountry) {
    const languageTag = normalizeLanguageTag(account.langCode || 'en');
    const parsedLanguage = new Intl.Locale(languageTag);
    const language = parsedLanguage.language.toLowerCase();
    const configuredCountry = account.geoLocale.toLowerCase() === 'auto' ? undefined : normalizeCountry(account.geoLocale);
    const languageCountry = normalizeCountry(parsedLanguage.region);
    const country = configuredCountry ?? normalizeCountry(resolvedCountry) ?? languageCountry;
    const localeCountry = country ?? languageCountry;
    const locale = localeCountry
        ? new Intl.Locale(languageTag, { region: localeCountry }).toString()
        : parsedLanguage.toString();
    const acceptedLocales = locale.toLowerCase() === language ? [language] : [locale, language];
    const acceptLanguage = acceptedLocales
        .map((acceptedLocale, index) => (index === 0 ? acceptedLocale : `${acceptedLocale};q=${1 - index * 0.1}`))
        .join(',');
    return {
        language,
        ...(country ? { country } : {}),
        locale,
        acceptedLocales,
        acceptLanguage
    };
}
function fingerprintMatchesLocale(fingerprint, expected) {
    try {
        const navigatorLocale = normalizeLanguageTag(fingerprint.fingerprint.navigator.language);
        const acceptLanguageEntry = Object.entries(fingerprint.headers).find(([name]) => name.toLowerCase() === 'accept-language');
        const headerLocale = acceptLanguageEntry?.[1]?.split(',')[0]?.trim();
        return (navigatorLocale.toLowerCase() === expected.locale.toLowerCase() &&
            Boolean(headerLocale) &&
            normalizeLanguageTag(headerLocale).toLowerCase() === expected.locale.toLowerCase());
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=Locale.js.map