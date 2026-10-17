"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionActivityRunner = void 0;
const BaseActivity_1 = require("../BaseActivity");
class PromotionActivityRunner extends BaseActivity_1.BaseActivity {
    async run(promotions) {
        for (const [index, promotion] of promotions.entries()) {
            try {
                await this.runPromotion(promotion);
                if (index < promotions.length - 1) {
                    await this.bot.utils.wait(this.bot.utils.randomDelay(5000, 15000));
                }
            }
            catch (error) {
                this.bot.logger.error(this.bot.isMobile, 'ACTIVITY', `Error while solving activity "${promotion.title}" | message=${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    async runPromotion(promotion) {
        const type = promotion.promotionType?.toLowerCase() ?? '';
        const name = promotion.name?.toLowerCase() ?? '';
        const offerId = promotion.offerId;
        this.bot.logger.debug(this.bot.isMobile, 'ACTIVITY', `Processing activity | title="${promotion.title}" | offerId=${offerId} | type=${type}`);
        if (type !== 'urlreward') {
            this.bot.logger.warn(this.bot.isMobile, 'ACTIVITY', `Skipped activity "${promotion.title}" | offerId=${offerId} | reason=unsupported type "${promotion.promotionType}"`);
            return;
        }
        const isSearchOnBing = name.includes('exploreonbing');
        if (isSearchOnBing && !this.bot.config.activities.searchOnBing) {
            this.logDisabled('SearchOnBing', offerId);
            return;
        }
        if (!isSearchOnBing && !this.bot.config.activities.urlReward) {
            this.logDisabled('UrlReward', offerId);
            return;
        }
        if (isSearchOnBing) {
            this.bot.logger.info(this.bot.isMobile, 'ACTIVITY', `Found activity type "SearchOnBing" | title="${promotion.title}" | offerId=${offerId}`);
            const page = this.bot.isMobile ? this.bot.mainMobilePage : this.bot.mainDesktopPage;
            await this.bot.activities.doSearchOnBing(promotion, page);
            return;
        }
        this.bot.logger.info(this.bot.isMobile, 'ACTIVITY', `Found activity type "UrlReward" | title="${promotion.title}" | offerId=${offerId}`);
        await this.bot.activities.doUrlReward(promotion);
    }
    logDisabled(activity, offerId) {
        this.bot.logger.info(this.bot.isMobile, 'ACTIVITY', `Skipping "${activity}" (disabled in config) | offerId=${offerId}`);
    }
}
exports.PromotionActivityRunner = PromotionActivityRunner;
//# sourceMappingURL=PromotionActivityRunner.js.map