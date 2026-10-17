"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MorePromotions = void 0;
const BaseActivity_1 = require("../BaseActivity");
const PromotionActivityRunner_1 = require("./PromotionActivityRunner");
class MorePromotions extends BaseActivity_1.BaseActivity {
    async run(data) {
        const promotions = [
            ...new Map([
                ...(data.dashboard.morePromotions ?? []),
                ...(data.dashboard.morePromotionsWithoutPromotionalItems ?? [])
            ]
                .filter(Boolean)
                .map(promotion => [promotion.offerId, promotion])).values()
        ];
        const pending = promotions.filter(promotion => this.isActionable(promotion));
        if (!pending.length) {
            this.bot.logger.info(this.bot.isMobile, 'MORE-PROMOTIONS', 'All "More Promotions" items have already been completed');
            return;
        }
        this.bot.logger.info(this.bot.isMobile, 'MORE-PROMOTIONS', `Started solving "More Promotions" items | remaining=${pending.length}`);
        await new PromotionActivityRunner_1.PromotionActivityRunner(this.bot).run(pending);
        this.bot.logger.info(this.bot.isMobile, 'MORE-PROMOTIONS', 'Finished processing "More Promotions" items');
    }
    isActionable(promotion) {
        if (promotion.complete || promotion.pointProgressMax <= 0)
            return false;
        if (promotion.exclusiveLockedFeatureStatus === 'locked' || !promotion.promotionType)
            return false;
        if (promotion.priority < 0 && promotion.exclusiveLockedFeatureStatus !== 'unlocked')
            return false;
        return this.getAttribute(promotion, 'promotional') !== 'True';
    }
    getAttribute(promotion, key) {
        const attributes = promotion.attributes;
        if (!attributes || typeof attributes !== 'object')
            return undefined;
        return attributes[key];
    }
}
exports.MorePromotions = MorePromotions;
//# sourceMappingURL=MorePromotions.js.map