import type { BrowserFingerprintWithHeaders } from 'fingerprint-generator';
import type { Account } from '../interface/Account';
export interface AccountLocale {
    language: string;
    country?: string;
    locale: string;
    acceptedLocales: string[];
    acceptLanguage: string;
}
type LocaleAccount = Pick<Account, 'langCode' | 'geoLocale'>;
export declare function normalizeLanguageTag(value: string): string;
export declare function normalizeCountry(value: string | undefined): string | undefined;
export declare function resolveAccountLocale(account: LocaleAccount, resolvedCountry?: string): AccountLocale;
export declare function fingerprintMatchesLocale(fingerprint: BrowserFingerprintWithHeaders, expected: AccountLocale): boolean;
export {};
//# sourceMappingURL=Locale.d.ts.map