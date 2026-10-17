import type { BrowserContext, Cookie, Page } from 'patchright';
import type { MicrosoftRewardsBot } from '../index';
import type { PageSnapshot, ParsedOffer } from './ReactFunc';
import type { DashboardData } from './../interface/DashboardData';
import type { AppEarnablePoints, BrowserEarnablePoints } from '../interface/Points';
import type { AppDashboardData } from '../interface/AppDashBoardData';
export default class BrowserFunc {
    private bot;
    private rewardsDeploymentId;
    constructor(bot: MicrosoftRewardsBot);
    getDashboardData(cookies?: Cookie[]): Promise<DashboardData>;
    getAppDashboardData(): Promise<AppDashboardData>;
    getBrowserEarnablePoints(data?: DashboardData): Promise<BrowserEarnablePoints>;
    getAppEarnablePoints(): Promise<AppEarnablePoints>;
    getCurrentPoints(): Promise<number>;
    bootstrap(page: Page): Promise<void>;
    private fetchBootstrapHtml;
    private resolveActionIds;
    private fetchJsChunks;
    private extractDynamicChunkPaths;
    closeBrowser(browser: BrowserContext, email: string, persistSession?: boolean): Promise<void>;
    private getActivePage;
    getRewardsPageHtml(url: string, route: string): Promise<string | null>;
    private getCachedCookies;
    checkpointActiveSession(source?: string): Promise<boolean>;
    synchronizeActiveBrowserCookies(source: string, applyCached?: boolean): Promise<boolean>;
    private updateCookieCache;
    private syncActiveCookies;
    private filterCookiesForUrl;
    private applyResponseCookies;
    private parseSetCookie;
    private defaultCookiePath;
    private splitCombinedSetCookieHeader;
    buildCookieHeader(cookies: Cookie[], allowedDomains?: string[]): string;
    reportServerAction(actionId: string, body: unknown[], opts?: {
        url?: string;
        referer?: string;
        routerStateTree?: string;
    }): Promise<{
        status: number;
        acknowledged: boolean;
        availablePoints: number | null;
    }>;
    refreshEarnSnapshot(): Promise<PageSnapshot | null>;
    private fetchRewardsHtml;
    ensureOffer(offerId: string): Promise<ParsedOffer | null>;
}
//# sourceMappingURL=BrowserFunc.d.ts.map