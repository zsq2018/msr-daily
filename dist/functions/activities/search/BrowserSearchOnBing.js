"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchOnBing = void 0;
const BaseActivity_1 = require("../BaseActivity");
const SearchOnBingShared_1 = require("./SearchOnBingShared");
const urls_1 = require("../../../constants/urls");
class SearchOnBing extends BaseActivity_1.BaseActivity {
    gainedPoints = 0;
    success = false;
    oldBalance = 0;
    async doSearchOnBing(promotion, page) {
        const offerId = promotion.offerId;
        this.oldBalance = Number(this.bot.userData.currentPoints ?? 0);
        this.gainedPoints = 0;
        this.success = false;
        this.bot.logger.info(this.bot.isMobile, 'SEARCH-ON-BING', `Starting SearchOnBing | offerId=${offerId} | title="${promotion.title}" | currentBalance=${this.oldBalance}`);
        try {
            const activated = await (0, SearchOnBingShared_1.activateSearchOnBing)(this.bot, promotion);
            if (!activated) {
                this.bot.logger.warn(this.bot.isMobile, 'SEARCH-ON-BING', `Search activity couldn't be activated, aborting | offerId=${offerId}`);
                return;
            }
            const queries = await (0, SearchOnBingShared_1.getSearchOnBingQueries)(this.bot, promotion);
            await this.searchBing(page, queries, promotion);
            if (this.success) {
                this.bot.logger.info(this.bot.isMobile, 'SEARCH-ON-BING', `Completed SearchOnBing | offerId=${offerId} | pointsGained=${this.gainedPoints} | currentBalance=${this.bot.userData.currentPoints} | previousBalance=${this.oldBalance}`, 'green');
            }
            else {
                this.bot.logger.warn(this.bot.isMobile, 'SEARCH-ON-BING', `Failed SearchOnBing | offerId=${offerId} | pointsGained=${this.gainedPoints} | currentBalance=${this.bot.userData.currentPoints} | previousBalance=${this.oldBalance}`);
            }
        }
        catch (error) {
            this.bot.logger.error(this.bot.isMobile, 'SEARCH-ON-BING', `Error in doSearchOnBing | offerId=${offerId} | message=${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            await page.goto(urls_1.URLs.rewards.earn).catch(() => { });
        }
    }
    async searchBing(page, queries, promotion) {
        queries = [...new Set(queries)];
        const offerId = promotion.offerId;
        this.bot.logger.debug(this.bot.isMobile, 'SEARCH-ON-BING-SEARCH', `Starting search loop | queriesCount=${queries.length} | targetPoints=${promotion.pointProgressMax} | currentBalance=${this.oldBalance}`);
        await this.bot.browser.func.synchronizeActiveBrowserCookies('SEARCH-ON-BING-COOKIE-SEED', true);
        await this.ensureSearchReady(page);
        let lastBalance = this.oldBalance;
        for (const [index, query] of queries.entries()) {
            try {
                this.bot.logger.debug(this.bot.isMobile, 'SEARCH-ON-BING-SEARCH', `Processing query | query="${query}"`);
                await this.bot.browser.func.synchronizeActiveBrowserCookies('SEARCH-ON-BING-COOKIE-SEED', true);
                await this.typeSearch(page, query);
                await this.bot.utils.wait(this.bot.utils.randomDelay(5000, 7000));
                await this.bot.browser.func.synchronizeActiveBrowserCookies('SEARCH-ON-BING-COOKIE-CAPTURE');
                const dashboard = (await this.bot.browser.func.getDashboardData()).dashboard;
                const newBalance = dashboard.userStatus.availablePoints;
                const offer = (0, SearchOnBingShared_1.findSearchOnBingOffer)(dashboard, offerId);
                const delta = newBalance - lastBalance;
                if (delta > 0) {
                    this.bot.userData.gainedPoints = (this.bot.userData.gainedPoints ?? 0) + delta;
                    lastBalance = newBalance;
                }
                this.bot.userData.currentPoints = newBalance;
                this.gainedPoints = newBalance - this.oldBalance;
                const offerProgress = offer ? `${offer.pointProgress}/${offer.pointProgressMax}` : 'unknown';
                const offerComplete = !!offer &&
                    (offer.complete || (offer.pointProgressMax > 0 && offer.pointProgress >= offer.pointProgressMax));
                this.bot.logger.debug(this.bot.isMobile, 'SEARCH-ON-BING-SEARCH', `Progress check | query="${query}" | offerProgress=${offerProgress} | offerComplete=${offerComplete} | currentBalance=${newBalance}`);
                if (offerComplete) {
                    this.success = true;
                    this.bot.logger.info(this.bot.isMobile, 'SEARCH-ON-BING-SEARCH', `SearchOnBing activity completed | pointsGained=${this.gainedPoints} | currentBalance=${newBalance} | query="${query}" | offerProgress=${offerProgress}`, 'green');
                    return;
                }
                this.bot.logger.warn(this.bot.isMobile, 'SEARCH-ON-BING-SEARCH', `${index + 1}/${queries.length} | activity not complete | offerProgress=${offerProgress} | query="${query}"`);
            }
            catch (error) {
                this.bot.logger.error(this.bot.isMobile, 'SEARCH-ON-BING-SEARCH', `Error during search loop | query="${query}" | message=${error instanceof Error ? error.message : String(error)}`);
            }
            finally {
                if (!this.success && index < queries.length - 1) {
                    await this.bot.utils.wait(this.bot.utils.randomDelay(5000, 15000));
                }
            }
        }
        this.bot.logger.warn(this.bot.isMobile, 'SEARCH-ON-BING-SEARCH', `Finished all queries without completing the activity | queriesTried=${queries.length} | offerId=${offerId} | pointsGained=${this.gainedPoints} | currentBalance=${this.bot.userData.currentPoints} | previousBalance=${this.oldBalance}`);
    }
    async ensureSearchReady(page) {
        const searchBox = page.locator('#sb_form_q');
        if (await searchBox.isVisible().catch(() => false))
            return;
        await page.goto(urls_1.URLs.bing.origin);
        await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => { });
        await this.bot.browser.utils.tryDismissAllMessages(page);
    }
    async typeSearch(page, query) {
        await this.ensureSearchReady(page);
        const selector = '#sb_form_q';
        const searchBox = page.locator(selector);
        await searchBox.waitFor({ state: 'visible', timeout: 15000 });
        await this.bot.utils.wait(500);
        await this.bot.browser.utils.ghostClick(page, selector, { clickCount: 3 });
        await searchBox.fill('');
        await page.keyboard.type(query, { delay: this.bot.utils.randomDelay(45, 90) });
        await page.keyboard.press('Enter');
        await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => { });
    }
}
exports.SearchOnBing = SearchOnBing;
//# sourceMappingURL=BrowserSearchOnBing.js.map