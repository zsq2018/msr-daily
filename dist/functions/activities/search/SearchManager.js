"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchManager = void 0;
const index_1 = require("../../../index");
const urls_1 = require("../../../constants/urls");
const SearchProgress_1 = require("./SearchProgress");
class SearchManager {
    bot;
    progress;
    constructor(bot) {
        this.bot = bot;
        this.progress = new SearchProgress_1.SearchProgress(bot);
    }
    async getSearchPoints() {
        const counters = await this.progress.getCounters();
        const quotas = this.progress.calculateQuotas(counters);
        const mobileMissing = quotas.mobile.remaining;
        const desktopQuota = this.combineQuotas(quotas.desktop, quotas.edge);
        const desktopMissing = desktopQuota.remaining;
        const doMobile = this.bot.config.workers.doMobileSearch && mobileMissing > 0;
        const doDesktop = this.bot.config.workers.doDesktopSearch && desktopMissing > 0;
        this.bot.logger.info('main', 'SEARCH-MANAGER', `Mobile: ${this.describeQuota(this.bot.config.workers.doMobileSearch, quotas.mobile)}` +
            ` | Desktop: ${this.describeQuota(this.bot.config.workers.doDesktopSearch, desktopQuota)}` +
            `${quotas.edge.max > 0 ? ` | Edge: ${quotas.edge.earned}/${quotas.edge.max}` : ''}`);
        return { doMobile, doDesktop, mobileMissing, desktopMissing };
    }
    combineQuotas(...quotas) {
        return quotas.reduce((total, quota) => ({
            earned: total.earned + quota.earned,
            max: total.max + quota.max,
            remaining: total.remaining + quota.remaining
        }), { earned: 0, max: 0, remaining: 0 });
    }
    describeQuota(enabled, quota) {
        if (!enabled)
            return `skip (disabled, ${quota.earned}/${quota.max})`;
        if (quota.remaining <= 0)
            return `skip (complete, ${quota.earned}/${quota.max})`;
        return `run (${quota.earned}/${quota.max}, missing ${quota.remaining})`;
    }
    searchMobile(account) {
        return this.search(account, true);
    }
    searchDesktop(account) {
        return this.search(account, false);
    }
    search(account, isMobile) {
        const platform = isMobile ? 'Mobile' : 'Desktop';
        const page = isMobile ? this.bot.mainMobilePage : this.bot.mainDesktopPage;
        return index_1.executionContext.run({ isMobile, account }, async () => {
            try {
                return await this.bot.activities.doSearch(page, isMobile);
            }
            catch (error) {
                this.bot.logger.error('main', 'SEARCH-MANAGER', `${platform} search failed | ${error instanceof Error ? error.message : String(error)}`);
                return 0;
            }
        });
    }
    async bonusMobile(account) {
        this.bot.logger.info('main', 'SEARCH-MANAGER', 'Starting bonus search farming');
        const gained = await index_1.executionContext.run({ isMobile: true, account }, async () => {
            try {
                return await this.bot.activities.doBonusSearches(this.bot.mainMobilePage);
            }
            catch (error) {
                this.bot.logger.error('main', 'SEARCH-MANAGER', `Bonus search failed | ${error instanceof Error ? error.message : String(error)}`);
                return 0;
            }
            finally {
                if (!this.bot.mainMobilePage.isClosed()) {
                    await this.bot.mainMobilePage.goto(urls_1.URLs.bing.origin).catch(() => { });
                }
            }
        });
        this.bot.logger.info('main', 'SEARCH-MANAGER', `Bonus search summary | pointsGained=${gained} | currentBalance=${this.bot.userData.currentPoints}`);
        return gained;
    }
}
exports.SearchManager = SearchManager;
//# sourceMappingURL=SearchManager.js.map