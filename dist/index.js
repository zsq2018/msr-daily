"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executionContext = exports.MicrosoftRewardsBot = void 0;
exports.getCurrentContext = getCurrentContext;
const node_async_hooks_1 = require("node:async_hooks");
const cluster_1 = __importDefault(require("cluster"));
const package_json_1 = __importDefault(require("../package.json"));
const Browser_1 = __importDefault(require("./browser/Browser"));
const BrowserFunc_1 = __importDefault(require("./browser/BrowserFunc"));
const BrowserUtils_1 = __importDefault(require("./browser/BrowserUtils"));
const ReactFunc_1 = __importDefault(require("./browser/ReactFunc"));
const Logger_1 = require("./logging/Logger");
const Utils_1 = __importStar(require("./util/Utils"));
const Load_1 = require("./util/Load");
const SessionStore_1 = require("./util/SessionStore");
const Validator_1 = require("./util/Validator");
const Locale_1 = require("./util/Locale");
const Login_1 = require("./browser/auth/Login");
const Activities_1 = __importDefault(require("./functions/Activities"));
const SearchManager_1 = require("./functions/activities/search/SearchManager");
const Http_1 = __importDefault(require("./util/Http"));
const Discord_1 = require("./logging/Discord");
const Ntfy_1 = require("./logging/Ntfy");
const Telegram_1 = require("./logging/Telegram");
const executionContext = new node_async_hooks_1.AsyncLocalStorage();
exports.executionContext = executionContext;
function getCurrentContext() {
    const context = executionContext.getStore();
    if (!context) {
        return { isMobile: false, account: {} };
    }
    return context;
}
async function flushAllWebhooks(timeoutMs = 5000) {
    await Promise.allSettled([(0, Discord_1.flushDiscordQueue)(timeoutMs), (0, Ntfy_1.flushNtfyQueue)(timeoutMs), (0, Telegram_1.flushTelegramQueue)(timeoutMs)]);
    (0, SessionStore_1.closeSessionStore)();
}
class MicrosoftRewardsBot {
    logger;
    config;
    utils;
    activities = new Activities_1.default(this);
    browser;
    mainMobilePage;
    mainDesktopPage;
    userData;
    accountLocale;
    nextActions = {};
    nextRouterStateTree = '';
    reactSnapshot = null;
    reactSnapshots = {
        mobile: null,
        desktop: null
    };
    searchTopicsCache = null;
    accessToken = '';
    cookies;
    fingerprintMobile;
    fingerprintDesktop;
    get fingerprint() {
        const ctx = this.isMobile ? this.fingerprintMobile : this.fingerprintDesktop;
        return (ctx ?? this.fingerprintMobile ?? this.fingerprintDesktop);
    }
    activeWorkers;
    exitedWorkers;
    browserFactory = new Browser_1.default(this);
    accounts;
    searchManager;
    login = new Login_1.Login(this);
    http;
    constructor() {
        this.userData = {
            userName: '',
            geoLocale: 'US',
            langCode: 'en',
            timezoneOffset: '60',
            initialPoints: 0,
            currentPoints: 0,
            gainedPoints: 0
        };
        this.accountLocale = (0, Locale_1.resolveAccountLocale)({ langCode: 'en', geoLocale: 'US' });
        this.logger = new Logger_1.Logger(this);
        this.accounts = [];
        this.cookies = { mobile: [], desktop: [] };
        this.utils = new Utils_1.default();
        this.searchManager = new SearchManager_1.SearchManager(this);
        this.browser = {
            func: new BrowserFunc_1.default(this),
            utils: new BrowserUtils_1.default(this),
            react: new ReactFunc_1.default(this)
        };
        this.config = (0, Load_1.loadConfig)();
        this.activeWorkers = this.config.clusters;
        this.exitedWorkers = [];
    }
    get isMobile() {
        return getCurrentContext().isMobile;
    }
    get currentAccountEmail() {
        return getCurrentContext().account?.email || null;
    }
    async refreshCurrentRewardsContext(reason) {
        const context = getCurrentContext();
        const account = context.account;
        let page = context.isMobile ? this.mainMobilePage : this.mainDesktopPage;
        let recoverySession = null;
        let refreshSucceeded = false;
        if (!account?.email) {
            this.logger.debug(this.isMobile, 'CONTEXT-REFRESH', `Cannot refresh rewards context | reason=${reason} | account=unavailable`);
            return false;
        }
        try {
            this.logger.warn(this.isMobile, 'CONTEXT-REFRESH', `Refreshing rewards browser context after request failure | reason=${reason}`);
            if (!page || page.isClosed()) {
                recoverySession = await this.browserFactory.createBrowser(account);
                page = await recoverySession.context.newPage();
                if (context.isMobile) {
                    this.mainMobilePage = page;
                    this.fingerprintMobile = recoverySession.fingerprint;
                }
                else {
                    this.mainDesktopPage = page;
                    this.fingerprintDesktop = recoverySession.fingerprint;
                }
                await this.login.login(page, account);
            }
            else {
                this.nextActions = {};
                this.nextRouterStateTree = '';
                this.reactSnapshot = null;
                await this.browser.func.synchronizeActiveBrowserCookies('CONTEXT-REFRESH-COOKIE-SEED', true);
                try {
                    await this.browser.func.bootstrap(page);
                }
                catch {
                    await this.login.login(page, account);
                }
            }
            await this.browser.func.checkpointActiveSession('CONTEXT-REFRESH');
            const refreshedCookies = await page.context().cookies();
            this.logger.info(this.isMobile, 'CONTEXT-REFRESH', `Rewards context refreshed successfully | cookies=${refreshedCookies.length}`, 'green');
            refreshSucceeded = true;
            return true;
        }
        catch (error) {
            this.logger.error(this.isMobile, 'CONTEXT-REFRESH', `Rewards context refresh failed | reason=${reason} | message=${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
        finally {
            if (recoverySession) {
                await this.browser.func.closeBrowser(recoverySession.context, account.email, refreshSucceeded);
            }
        }
    }
    async initialize() {
        this.accounts = (0, Load_1.loadAccounts)();
        this.warnExperimental();
    }
    warnExperimental() {
        const exp = this.config.experimental;
        const searchFeatures = [exp.apiSearch && 'apiSearch', exp.apiSearchOnBing && 'apiSearchOnBing'].filter(Boolean);
        if (searchFeatures.length) {
            this.logger.warn('main', 'EXPERIMENTAL', `${searchFeatures.join(' + ')} enabled - these perform searches over HTTP with no real browser. ` +
                `This path is EXPERIMENTAL and UNSAFE and may get your account flagged or banned. ` +
                `Disable it under config.experimental if you are unsure.`, 'redBright');
        }
        if (exp.edgeBrowsing) {
            this.logger.warn('main', 'EXPERIMENTAL', 'edgeBrowsing enabled - the Edge browsing activity will be reported over HTTP in the background. ' +
                'This integration is experimental; disable it under config.experimental if it behaves unexpectedly.');
        }
    }
    async run() {
        const totalAccounts = this.accounts.length;
        const runStartTime = Date.now();
        this.logger.info('main', 'RUN-START', `Starting Microsoft Rewards Script | v${package_json_1.default.version} | Accounts: ${totalAccounts} | Clusters: ${this.config.clusters}`);
        if (this.config.clusters > 1) {
            if (cluster_1.default.isPrimary) {
                await this.runMaster(runStartTime);
            }
            else {
                this.runWorker(runStartTime);
            }
        }
        else {
            await this.runTasks(this.accounts, runStartTime);
        }
    }
    async runMaster(runStartTime) {
        void this.logger.info('main', 'CLUSTER-PRIMARY', `Primary process started | PID: ${process.pid}`);
        const rawChunks = this.utils.chunkArray(this.accounts, this.config.clusters);
        const accountChunks = rawChunks.filter(c => c && c.length > 0);
        this.activeWorkers = accountChunks.length;
        const allAccountStats = [];
        let hadWorkerFailure = false;
        for (const [chunkIndex, chunk] of accountChunks.entries()) {
            if (chunkIndex > 0) {
                await this.waitBeforeNextAccount(chunk[0]?.email);
            }
            const worker = cluster_1.default.fork();
            worker.send?.({ chunk, runStartTime });
            worker.on('message', (msg) => {
                if (msg.__stats) {
                    allAccountStats.push(...msg.__stats);
                }
                const log = msg.__ipcLog;
                if (log && typeof log.content === 'string') {
                    const { webhook } = this.config;
                    const { content, level } = log;
                    if (webhook.discord?.enabled && webhook.discord.url) {
                        (0, Discord_1.sendDiscord)(webhook.discord.url, content, level);
                    }
                    if (webhook.ntfy?.enabled && webhook.ntfy.url) {
                        (0, Ntfy_1.sendNtfy)(webhook.ntfy, content, level);
                    }
                    if (webhook.telegram?.enabled && webhook.telegram.botToken && webhook.telegram.chatId) {
                        (0, Telegram_1.sendTelegram)(webhook.telegram, content, level);
                    }
                }
            });
        }
        const onWorkerExit = async (worker, code, signal) => {
            const { pid } = worker.process;
            if (!pid || this.exitedWorkers.includes(pid)) {
                return;
            }
            this.exitedWorkers.push(pid);
            this.activeWorkers -= 1;
            const failed = (code ?? 0) !== 0 || Boolean(signal);
            if (failed) {
                hadWorkerFailure = true;
            }
            this.logger.warn('main', 'CLUSTER-WORKER-EXIT', `Worker ${pid} exit | Code: ${code ?? 'n/a'} | Signal: ${signal ?? 'n/a'} | Active workers: ${this.activeWorkers}`);
            if (this.activeWorkers <= 0) {
                const totalCollectedPoints = allAccountStats.reduce((sum, s) => sum + s.collectedPoints, 0);
                const totalInitialPoints = allAccountStats.reduce((sum, s) => sum + s.initialPoints, 0);
                const totalFinalPoints = allAccountStats.reduce((sum, s) => sum + s.finalPoints, 0);
                const totalDurationMinutes = ((Date.now() - runStartTime) / 1000 / 60).toFixed(1);
                this.logger.info('main', 'RUN-END', `Completed all accounts | accountsProcessed=${allAccountStats.length} | pointsGained=${totalCollectedPoints} | previousBalance=${totalInitialPoints} | currentBalance=${totalFinalPoints} | runtimeMinutes=${totalDurationMinutes}`, 'green');
                await flushAllWebhooks();
                process.exit(hadWorkerFailure ? 1 : 0);
            }
        };
        cluster_1.default.on('exit', (worker, code, signal) => {
            void onWorkerExit(worker, code ?? undefined, signal ?? undefined);
        });
        cluster_1.default.on('disconnect', worker => {
            const pid = worker.process?.pid;
            this.logger.warn('main', 'CLUSTER-WORKER-DISCONNECT', `Worker ${pid ?? '?'} disconnected`);
        });
    }
    runWorker(runStartTimeFromMaster) {
        void this.logger.info('main', 'CLUSTER-WORKER-START', `Worker spawned | PID: ${process.pid}`);
        process.on('message', async ({ chunk, runStartTime }) => {
            void this.logger.info('main', 'CLUSTER-WORKER-TASK', `Worker ${process.pid} received ${chunk.length} accounts.`);
            try {
                const stats = await this.runTasks(chunk, runStartTime ?? runStartTimeFromMaster ?? Date.now());
                if (process.send) {
                    process.send({ __stats: stats });
                }
                await flushAllWebhooks();
                process.exit(0);
            }
            catch (error) {
                this.logger.error('main', 'CLUSTER-WORKER-ERROR', `Worker task crash: ${error instanceof Error ? error.message : String(error)}`);
                await flushAllWebhooks();
                process.exit(1);
            }
        });
    }
    async runTasks(accounts, runStartTime) {
        const accountStats = [];
        for (const [accountIndex, account] of accounts.entries()) {
            if (accountIndex > 0) {
                await this.waitBeforeNextAccount(account.email);
            }
            const accountStartTime = Date.now();
            const accountEmail = account.email;
            this.userData.userName = this.utils.getEmailUsername(accountEmail);
            this.userData.timezoneOffset = String(new Date().getTimezoneOffset());
            try {
                const cachedRegion = account.geoLocale === 'auto' ? (0, SessionStore_1.loadResolvedRegion)(this.config.sessionPath, accountEmail) : undefined;
                this.accountLocale = (0, Locale_1.resolveAccountLocale)(account, cachedRegion);
                this.userData.langCode = this.accountLocale.language;
                this.userData.geoLocale = this.accountLocale.country ?? 'US';
                this.logger.info('main', 'ACCOUNT-START', `Starting account: ${accountEmail} | geoLocale: ${account.geoLocale} | locale: ${this.accountLocale.locale}${cachedRegion ? ` | cachedRegion: ${cachedRegion}` : ''}`);
                this.http = new Http_1.default(account.proxy, {
                    'Accept-Language': this.accountLocale.acceptLanguage
                });
                const result = await this.Main(account).catch(error => {
                    void this.logger.error(true, 'FLOW', `Mobile flow failed for ${accountEmail}: ${error instanceof Error ? error.message : String(error)}`);
                    return undefined;
                });
                const durationSeconds = ((Date.now() - accountStartTime) / 1000).toFixed(1);
                if (result) {
                    const collectedPoints = result.collectedPoints ?? 0;
                    const accountInitialPoints = result.initialPoints ?? 0;
                    const accountFinalPoints = accountInitialPoints + collectedPoints;
                    if (result.skippedForBotWarning) {
                        accountStats.push({
                            email: accountEmail,
                            initialPoints: accountInitialPoints,
                            finalPoints: accountInitialPoints,
                            collectedPoints: 0,
                            duration: parseFloat(durationSeconds),
                            success: false,
                            error: 'Microsoft bot-score warning detected'
                        });
                        this.logger.warn('main', 'ACCOUNT-SKIP', `Skipped account: ${accountEmail} | reason=Fraud_UserWarning_BotScore_UX | durationSeconds=${durationSeconds}`);
                    }
                    else {
                        accountStats.push({
                            email: accountEmail,
                            initialPoints: accountInitialPoints,
                            finalPoints: accountFinalPoints,
                            collectedPoints: collectedPoints,
                            duration: parseFloat(durationSeconds),
                            success: true
                        });
                        this.logger.info('main', 'ACCOUNT-END', `Completed account: ${accountEmail} | pointsGained=${collectedPoints} | previousBalance=${accountInitialPoints} | currentBalance=${accountFinalPoints} | durationSeconds=${durationSeconds}`, 'green');
                    }
                }
                else {
                    accountStats.push({
                        email: accountEmail,
                        initialPoints: 0,
                        finalPoints: 0,
                        collectedPoints: 0,
                        duration: parseFloat(durationSeconds),
                        success: false,
                        error: 'Flow failed'
                    });
                }
            }
            catch (error) {
                const durationSeconds = ((Date.now() - accountStartTime) / 1000).toFixed(1);
                this.logger.error('main', 'ACCOUNT-ERROR', `${accountEmail}: ${error instanceof Error ? error.message : String(error)}`);
                accountStats.push({
                    email: accountEmail,
                    initialPoints: 0,
                    finalPoints: 0,
                    collectedPoints: 0,
                    duration: parseFloat(durationSeconds),
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        if (this.config.clusters <= 1 && cluster_1.default.isPrimary) {
            const totalCollectedPoints = accountStats.reduce((sum, s) => sum + s.collectedPoints, 0);
            const totalInitialPoints = accountStats.reduce((sum, s) => sum + s.initialPoints, 0);
            const totalFinalPoints = accountStats.reduce((sum, s) => sum + s.finalPoints, 0);
            const totalDurationMinutes = ((Date.now() - runStartTime) / 1000 / 60).toFixed(1);
            this.logger.info('main', 'RUN-END', `Completed all accounts | accountsProcessed=${accountStats.length} | pointsGained=${totalCollectedPoints} | previousBalance=${totalInitialPoints} | currentBalance=${totalFinalPoints} | runtimeMinutes=${totalDurationMinutes}`, 'green');
            await flushAllWebhooks();
            process.exit(0);
        }
        return accountStats;
    }
    async waitBeforeNextAccount(nextEmail) {
        const { min, max } = this.config.accountDelay;
        const minMs = typeof min === 'number' ? min : this.utils.stringToNumber(min);
        const maxMs = typeof max === 'number' ? max : this.utils.stringToNumber(max);
        if (minMs < 0 || maxMs < 0 || maxMs < minMs) {
            throw new Error('accountDelay must use non-negative values with max greater than or equal to min');
        }
        const delayMs = this.utils.randomNumber(Math.ceil(minMs), Math.floor(maxMs));
        this.logger.info('main', 'ACCOUNT-DELAY', `Waiting ${(delayMs / 1000).toFixed(1)} seconds before starting the next account${nextEmail ? ` (${nextEmail})` : ''}`);
        await this.utils.wait(delayMs);
    }
    async createDesktopSession(account) {
        const session = await this.browserFactory.createBrowser(account);
        this.mainDesktopPage = await session.context.newPage();
        this.fingerprintDesktop = session.fingerprint;
        this.logger.info(this.isMobile, 'BROWSER', `Desktop Browser started | ${account.email}`);
        await this.login.login(this.mainDesktopPage, account);
        await this.browser.func.checkpointActiveSession('LOGIN-CHECKPOINT');
        this.cookies.desktop = await session.context.cookies();
        return session;
    }
    async Main(account) {
        const accountEmail = account.email;
        this.logger.info('main', 'FLOW', `Starting session for ${accountEmail}`);
        this.accessToken = '';
        this.cookies = { mobile: [], desktop: [] };
        this.fingerprintMobile = undefined;
        this.fingerprintDesktop = undefined;
        this.reactSnapshot = null;
        this.reactSnapshots = { mobile: null, desktop: null };
        this.searchTopicsCache = null;
        const apiSearch = this.config.experimental.apiSearch;
        const apiSearchOnBing = this.config.experimental.apiSearchOnBing;
        const fullApi = apiSearch && (apiSearchOnBing || !this.config.activities.searchOnBing);
        const needsAppActivities = this.config.workers.doDailyCheckIn ||
            this.config.workers.doAppPromotions ||
            this.config.workers.doReadToEarn;
        const needsAppAccessToken = this.config.experimental.edgeBrowsing || needsAppActivities;
        let mobileSession = null;
        let desktopSession = null;
        const edgeBrowsingController = new AbortController();
        let edgeBrowsingTask = null;
        let edgeBrowsingFinished = false;
        const closeMobileSession = async () => {
            const session = mobileSession;
            if (!session)
                return;
            mobileSession = null;
            await executionContext.run({ isMobile: true, account }, async () => {
                await this.browser.func.checkpointActiveSession('PRE-BROWSER-CLOSE');
                await this.browser.func.closeBrowser(session.context, accountEmail);
            });
        };
        const closeDesktopSession = async () => {
            const session = desktopSession;
            if (!session)
                return;
            desktopSession = null;
            await executionContext.run({ isMobile: false, account }, async () => {
                await this.browser.func.checkpointActiveSession('PRE-BROWSER-CLOSE');
                await this.browser.func.closeBrowser(session.context, accountEmail);
            });
        };
        try {
            return await executionContext.run({ isMobile: true, account }, async () => {
                mobileSession = await this.browserFactory.createBrowser(account);
                const initialContext = mobileSession.context;
                this.mainMobilePage = await initialContext.newPage();
                this.logger.info('main', 'BROWSER', `Mobile Browser started | ${accountEmail}`);
                await this.login.login(this.mainMobilePage, account);
                if (needsAppAccessToken) {
                    try {
                        this.accessToken = await this.login.getAppAccessToken(this.mainMobilePage, accountEmail);
                    }
                    catch (error) {
                        this.logger.error('main', 'FLOW', `Failed to get mobile access token: ${error instanceof Error ? error.message : String(error)}`);
                        this.accessToken = '';
                    }
                }
                await this.browser.func.checkpointActiveSession('LOGIN-CHECKPOINT');
                this.cookies.mobile = await initialContext.cookies();
                this.fingerprintMobile = mobileSession.fingerprint;
                if (fullApi) {
                    await closeMobileSession();
                    this.logger.info('main', 'FLOW', 'Mobile login browser closed; continuing with the saved session and HTTP requests');
                }
                const data = await this.browser.func.getDashboardData();
                const hasBotScoreWarning = Array.isArray(data.dashboard.userWarnings) &&
                    data.dashboard.userWarnings.some(warning => warning?.name === 'Fraud_UserWarning_BotScore_UX');
                if (hasBotScoreWarning) {
                    const availablePoints = data.dashboard.userStatus.availablePoints ?? 0;
                    if (!this.config.contintueOnBotWarning) {
                        this.logger.warn('main', 'BOT-WARNING', `Microsoft Rewards reported Fraud_UserWarning_BotScore_UX for ${accountEmail}. ` +
                            'This account will be skipped for safety. The preferred action is to stop automation for this account and wait a few days. ' +
                            'To continue anyway (not recommended), set "contintueOnBotWarning": true.');
                        return {
                            initialPoints: availablePoints,
                            collectedPoints: 0,
                            skippedForBotWarning: true
                        };
                    }
                    this.logger.warn('main', 'BOT-WARNING', `Microsoft Rewards reported Fraud_UserWarning_BotScore_UX for ${accountEmail}, but contintueOnBotWarning=true. ` +
                        'Continuing as configured is not recommended; waiting a few days is the preferred action.');
                }
                const profileCountry = (0, Locale_1.normalizeCountry)(data.dashboard.userProfile.attributes.country);
                if (account.geoLocale === 'auto') {
                    if (profileCountry) {
                        (0, SessionStore_1.saveResolvedRegion)(this.config.sessionPath, accountEmail, profileCountry);
                    }
                    else {
                        this.logger.warn('main', 'GEO-LOCALE', `Microsoft profile returned an invalid country; retaining ${this.accountLocale.country ?? 'US fallback'}`);
                    }
                }
                this.accountLocale = (0, Locale_1.resolveAccountLocale)(account, profileCountry ?? this.accountLocale.country);
                this.userData.langCode = this.accountLocale.language;
                this.userData.geoLocale = this.accountLocale.country ?? 'US';
                this.http.setDefaultHeaders({
                    'Accept-Language': this.accountLocale.acceptLanguage
                });
                let appData = null;
                if (this.accessToken && needsAppActivities) {
                    try {
                        appData = await this.browser.func.getAppDashboardData();
                    }
                    catch (error) {
                        this.logger.warn('main', 'LOGIN-APP', `App dashboard unavailable - app activities will be skipped this run | message=${error instanceof Error ? error.message : String(error)}`);
                        this.accessToken = '';
                    }
                }
                this.userData.initialPoints = data.dashboard.userStatus.availablePoints;
                this.userData.currentPoints = data.dashboard.userStatus.availablePoints;
                const initialPoints = this.userData.initialPoints ?? 0;
                const browserEarnable = await this.browser.func.getBrowserEarnablePoints(data);
                let appEarnable = null;
                if (this.accessToken && needsAppActivities) {
                    try {
                        appEarnable = await this.browser.func.getAppEarnablePoints();
                    }
                    catch (error) {
                        this.logger.warn('main', 'LOGIN-APP', `App earnable-points lookup failed - app activities will be skipped this run | message=${error instanceof Error ? error.message : String(error)}`);
                        this.accessToken = '';
                        appData = null;
                    }
                }
                const appAvailable = Boolean(this.accessToken && appData);
                this.logger.info('main', 'POINTS', `Earnable today | Mobile: ${browserEarnable.mobileSearchPoints} | Browser: ${browserEarnable.desktopSearchPoints} | App: ${appEarnable?.totalEarnablePoints ?? 0} | ${accountEmail} | locale: ${this.accountLocale.locale}`);
                const parallel = this.config.searchSettings.parallelSearching;
                const doBonus = this.config.workers.doBonusSearches;
                const doVisualSearch = this.config.workers.doVisualSearch;
                let mobilePoints = 0;
                let desktopPoints = 0;
                let bonusPoints = 0;
                if (this.config.experimental.edgeBrowsing) {
                    edgeBrowsingTask = this.activities
                        .doEdgeBrowsing(data, edgeBrowsingController.signal)
                        .catch(error => {
                        this.logger.error(this.isMobile, 'EDGE-BROWSING', `Unexpected background task failure | message=${error instanceof Error ? error.message : String(error)}`);
                    })
                        .finally(() => {
                        edgeBrowsingFinished = true;
                    });
                }
                if (fullApi) {
                    if (this.config.ensureStreakProtection) {
                        await this.activities.doEnsureStreakProtection();
                    }
                    if (this.config.workers.doPunchCards)
                        await this.activities.doPunchCardsMobile(data);
                    if (this.config.workers.doActivateSearchPerk)
                        await this.activities.doActivateSearchPerk(data);
                    const plan = await this.searchManager.getSearchPoints();
                    const doMobileSearch = plan.doMobile;
                    const doDesktopSearch = plan.doDesktop;
                    const desktopBrowserNeeded = this.config.workers.doPunchCards || doVisualSearch;
                    if (doDesktopSearch && !desktopBrowserNeeded) {
                        this.cookies.desktop = [...this.cookies.mobile];
                        this.fingerprintDesktop = await this.browserFactory.generateFingerprint(false);
                    }
                    if (desktopBrowserNeeded) {
                        await executionContext.run({ isMobile: false, account }, async () => {
                            desktopSession = await this.createDesktopSession(account);
                            if (this.config.workers.doPunchCards)
                                await this.activities.doPunchCardsDesktop();
                            if (doVisualSearch)
                                await this.activities.doVisualSearch(data);
                        });
                        await closeDesktopSession();
                    }
                    if (this.config.workers.doDailySet)
                        await this.activities.doDailySet(data);
                    if (this.config.workers.doMorePromotions)
                        await this.activities.doMorePromotions(data);
                    if (appAvailable && this.config.workers.doDailyCheckIn)
                        await this.activities.doDailyCheckIn();
                    if (appAvailable && this.config.workers.doAppPromotions && appData)
                        await this.activities.doAppPromotions(appData);
                    if (appAvailable && this.config.workers.doReadToEarn)
                        await this.activities.doReadToEarn();
                    if (doMobileSearch)
                        mobilePoints = await this.searchManager.searchMobile(account);
                    if (doBonus)
                        bonusPoints = await this.searchManager.bonusMobile(account);
                    if (doDesktopSearch)
                        desktopPoints = await this.searchManager.searchDesktop(account);
                }
                else {
                    if (this.config.ensureStreakProtection) {
                        await this.activities.doEnsureStreakProtection();
                    }
                    if (this.config.workers.doDailySet)
                        await this.activities.doDailySet(data);
                    if (this.config.workers.doActivateSearchPerk)
                        await this.activities.doActivateSearchPerk(data);
                    if (this.config.workers.doMorePromotions)
                        await this.activities.doMorePromotions(data);
                    if (appAvailable && this.config.workers.doDailyCheckIn)
                        await this.activities.doDailyCheckIn();
                    if (appAvailable && this.config.workers.doAppPromotions && appData)
                        await this.activities.doAppPromotions(appData);
                    if (appAvailable && this.config.workers.doReadToEarn)
                        await this.activities.doReadToEarn();
                    if (this.config.workers.doPunchCards)
                        await this.activities.doPunchCardsMobile(data);
                    const plan = await this.searchManager.getSearchPoints();
                    const doMobileSearch = plan.doMobile;
                    const doDesktopSearch = plan.doDesktop;
                    const desktopBrowserNeeded = this.config.workers.doPunchCards || doVisualSearch || (doDesktopSearch && !apiSearch);
                    if (apiSearch && doDesktopSearch && !desktopBrowserNeeded) {
                        this.cookies.desktop = [...this.cookies.mobile];
                        this.fingerprintDesktop = await this.browserFactory.generateFingerprint(false);
                    }
                    if (parallel && !apiSearch && doMobileSearch && doDesktopSearch) {
                        await executionContext.run({ isMobile: false, account }, async () => {
                            desktopSession = await this.createDesktopSession(account);
                            if (this.config.workers.doPunchCards)
                                await this.activities.doPunchCardsDesktop();
                            if (doVisualSearch)
                                await this.activities.doVisualSearch(data);
                        });
                        const mobileWork = async () => {
                            try {
                                const searchPoints = await this.searchManager.searchMobile(account);
                                const extraPoints = doBonus ? await this.searchManager.bonusMobile(account) : 0;
                                return [searchPoints, extraPoints];
                            }
                            finally {
                                await closeMobileSession();
                            }
                        };
                        const desktopWork = async () => {
                            try {
                                return await this.searchManager.searchDesktop(account);
                            }
                            finally {
                                await closeDesktopSession();
                            }
                        };
                        [[mobilePoints, bonusPoints], desktopPoints] = await Promise.all([mobileWork(), desktopWork()]);
                    }
                    else {
                        if (apiSearch)
                            await closeMobileSession();
                        if (doMobileSearch)
                            mobilePoints = await this.searchManager.searchMobile(account);
                        if (doBonus)
                            bonusPoints = await this.searchManager.bonusMobile(account);
                        if (!apiSearch)
                            await closeMobileSession();
                        if (desktopBrowserNeeded) {
                            await executionContext.run({ isMobile: false, account }, async () => {
                                desktopSession = await this.createDesktopSession(account);
                                if (this.config.workers.doPunchCards)
                                    await this.activities.doPunchCardsDesktop();
                                if (doVisualSearch)
                                    await this.activities.doVisualSearch(data);
                                if (doDesktopSearch && !apiSearch) {
                                    desktopPoints = await this.searchManager.searchDesktop(account);
                                }
                            });
                            await closeDesktopSession();
                        }
                        if (doDesktopSearch && apiSearch) {
                            desktopPoints = await this.searchManager.searchDesktop(account);
                        }
                    }
                }
                this.logger.info('main', 'SEARCH-MANAGER', `Search summary | mobile=${mobilePoints} | desktop=${desktopPoints} | bonus=${bonusPoints} | total=${mobilePoints + desktopPoints + bonusPoints}`);
                if (this.config.workers.doClaimBonusPoints)
                    await this.activities.doClaimBonusPoints();
                if (edgeBrowsingTask) {
                    if (!edgeBrowsingFinished) {
                        this.logger.info(this.isMobile, 'EDGE-BROWSING', 'Foreground activities finished; waiting for the background Edge browsing activity');
                    }
                    await edgeBrowsingTask;
                    edgeBrowsingTask = null;
                }
                const finalPoints = await this.browser.func.getCurrentPoints();
                const collectedPoints = finalPoints - initialPoints;
                this.logger.info('main', 'FLOW', `Points collected | pointsGained=${collectedPoints} | currentBalance=${finalPoints} | account=${accountEmail}`);
                return {
                    initialPoints,
                    collectedPoints: collectedPoints || 0
                };
            });
        }
        finally {
            if (edgeBrowsingTask) {
                edgeBrowsingController.abort();
                await edgeBrowsingTask;
                edgeBrowsingTask = null;
            }
            if (mobileSession) {
                try {
                    await closeMobileSession();
                }
                catch (error) {
                    this.logger.debug('main', 'CLEANUP', `Mobile context close failed | ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            if (desktopSession) {
                try {
                    await closeDesktopSession();
                }
                catch (error) {
                    this.logger.debug('main', 'CLEANUP', `Desktop context close failed | ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
    }
}
exports.MicrosoftRewardsBot = MicrosoftRewardsBot;
async function main() {
    (0, Validator_1.checkNodeVersion)();
    const rewardsBot = new MicrosoftRewardsBot();
    process.on('beforeExit', () => {
        void flushAllWebhooks();
    });
    process.on('SIGINT', async () => {
        rewardsBot.logger.warn('main', 'PROCESS', 'SIGINT received, flushing and exiting...');
        await flushAllWebhooks();
        process.exit(130);
    });
    process.on('SIGTERM', async () => {
        rewardsBot.logger.warn('main', 'PROCESS', 'SIGTERM received, flushing and exiting...');
        await flushAllWebhooks();
        process.exit(143);
    });
    process.on('uncaughtException', async (error) => {
        if ((0, Utils_1.isBrowserClosedError)(error)) {
            rewardsBot.logger.debug('main', 'UNCAUGHT-EXCEPTION', `Ignoring benign browser-closed error during teardown | ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        rewardsBot.logger.error('main', 'UNCAUGHT-EXCEPTION', error);
        await flushAllWebhooks();
        process.exit(1);
    });
    process.on('unhandledRejection', async (reason) => {
        if ((0, Utils_1.isBrowserClosedError)(reason)) {
            rewardsBot.logger.debug('main', 'UNHANDLED-REJECTION', `Ignoring benign browser-closed rejection during teardown | ${reason instanceof Error ? reason.message : String(reason)}`);
            return;
        }
        rewardsBot.logger.error('main', 'UNHANDLED-REJECTION', reason);
        await flushAllWebhooks();
        process.exit(1);
    });
    try {
        await rewardsBot.initialize();
        await rewardsBot.run();
    }
    catch (error) {
        rewardsBot.logger.error('main', 'MAIN-ERROR', error);
        await flushAllWebhooks();
        process.exitCode = 1;
    }
}
main().catch(async (error) => {
    const tmpBot = new MicrosoftRewardsBot();
    tmpBot.logger.error('main', 'MAIN-ERROR', error);
    await flushAllWebhooks();
    process.exit(1);
});
//# sourceMappingURL=index.js.map