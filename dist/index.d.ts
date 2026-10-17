import { AsyncLocalStorage } from 'node:async_hooks';
import type { BrowserContext, Cookie, Page } from 'patchright';
import type { BrowserFingerprintWithHeaders } from 'fingerprint-generator';
import BrowserFunc from './browser/BrowserFunc';
import BrowserUtils from './browser/BrowserUtils';
import ReactFunc from './browser/ReactFunc';
import type { PageSnapshot } from './browser/ReactFunc';
import { Logger } from './logging/Logger';
import Utils from './util/Utils';
import type { AccountLocale } from './util/Locale';
import Activities from './functions/Activities';
import type { Account } from './interface/Account';
import HttpClient from './util/Http';
interface ExecutionContext {
    isMobile: boolean;
    account: Account;
}
interface BrowserSession {
    context: BrowserContext;
    fingerprint: BrowserFingerprintWithHeaders;
}
interface AccountRunResult {
    initialPoints: number;
    collectedPoints: number;
    skippedForBotWarning?: boolean;
}
declare const executionContext: AsyncLocalStorage<ExecutionContext>;
export declare function getCurrentContext(): ExecutionContext;
interface UserData {
    userName: string;
    geoLocale: string;
    langCode: string;
    timezoneOffset: string;
    initialPoints: number;
    currentPoints: number;
    gainedPoints: number;
}
export declare class MicrosoftRewardsBot {
    logger: Logger;
    config: import("./interface/Config").Config;
    utils: Utils;
    activities: Activities;
    browser: {
        func: BrowserFunc;
        utils: BrowserUtils;
        react: ReactFunc;
    };
    mainMobilePage: Page;
    mainDesktopPage: Page;
    userData: UserData;
    accountLocale: AccountLocale;
    nextActions: Record<string, string>;
    nextRouterStateTree: string;
    reactSnapshot: PageSnapshot | null;
    reactSnapshots: {
        mobile: PageSnapshot | null;
        desktop: PageSnapshot | null;
    };
    searchTopicsCache: {
        key: string;
        topics: Promise<string[]>;
    } | null;
    accessToken: string;
    cookies: {
        mobile: Cookie[];
        desktop: Cookie[];
    };
    private fingerprintMobile?;
    private fingerprintDesktop?;
    get fingerprint(): BrowserFingerprintWithHeaders;
    private activeWorkers;
    private exitedWorkers;
    private browserFactory;
    private accounts;
    private searchManager;
    private login;
    http: HttpClient;
    constructor();
    get isMobile(): boolean;
    get currentAccountEmail(): string | null;
    refreshCurrentRewardsContext(reason: string): Promise<boolean>;
    initialize(): Promise<void>;
    private warnExperimental;
    run(): Promise<void>;
    private runMaster;
    private runWorker;
    private runTasks;
    private waitBeforeNextAccount;
    createDesktopSession(account: Account): Promise<BrowserSession>;
    Main(account: Account): Promise<AccountRunResult>;
}
export { executionContext };
//# sourceMappingURL=index.d.ts.map