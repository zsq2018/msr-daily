"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailySet = void 0;
const BaseActivity_1 = require("../BaseActivity");
const PromotionActivityRunner_1 = require("./PromotionActivityRunner");
class DailySet extends BaseActivity_1.BaseActivity {
    async run(data) {
        const today = this.bot.utils.getFormattedDate();
        const pending = data.dashboard.dailySetPromotions[today]?.filter(item => !item.complete && item.pointProgressMax > 0) ?? [];
        if (!pending.length) {
            this.bot.logger.info(this.bot.isMobile, 'DAILY-SET', 'All "Daily Set" items have already been completed');
            return;
        }
        this.bot.logger.info(this.bot.isMobile, 'DAILY-SET', `Started solving "Daily Set" items | remaining=${pending.length}`);
        await new PromotionActivityRunner_1.PromotionActivityRunner(this.bot).run(pending);
        this.bot.logger.info(this.bot.isMobile, 'DAILY-SET', 'Finished processing "Daily Set" items');
    }
}
exports.DailySet = DailySet;
//# sourceMappingURL=DailySet.js.map