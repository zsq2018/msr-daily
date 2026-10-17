import { httpRequest } from '../util/Http';
import type { BrowserFingerprintWithHeaders } from 'fingerprint-generator';
import type { MicrosoftRewardsBot } from '../index';
interface EdgeVersions {
    android: string;
    desktop: string;
}
interface AppComponents {
    not_a_brand_version: string;
    not_a_brand_major_version: string;
    edge_version: string;
    edge_major_version: string;
    chrome_version: string;
    chrome_major_version: string;
    chrome_reduced_version: string;
}
export declare class UserAgentManager {
    private bot;
    private readonly request;
    private static readonly NOT_A_BRAND_VERSION;
    private static readonly VERSION_LOOKUP_TIMEOUT_MS;
    private static readonly VERSION_PATTERN;
    private readonly appComponents;
    private chromeVersion?;
    private edgeVersions?;
    private static readonly MOBILE_MODELS;
    constructor(bot: MicrosoftRewardsBot, request?: typeof httpRequest);
    private static pickMobileModel;
    getUserAgent(isMobile: boolean): Promise<{
        userAgent: string;
        userAgentMetadata: {
            isMobile: boolean;
            platform: string;
            fullVersionList: {
                brand: string;
                version: string;
            }[];
            brands: {
                brand: string;
                version: string;
            }[];
            platformVersion: string;
            architecture: string;
            bitness: string;
            model: string;
        };
    }>;
    getChromeVersion(isMobile: boolean): Promise<string>;
    getEdgeVersions(isMobile: boolean): Promise<EdgeVersions>;
    getSystemComponents(mobile: boolean, androidVersion?: number): string;
    getAppComponents(isMobile: boolean): Promise<AppComponents>;
    private loadAppComponents;
    private static isValidVersion;
    updateFingerprintUserAgent(fingerprint: BrowserFingerprintWithHeaders, isMobile: boolean): Promise<BrowserFingerprintWithHeaders>;
}
export {};
//# sourceMappingURL=UserAgent.d.ts.map