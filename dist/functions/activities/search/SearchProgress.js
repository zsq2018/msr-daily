"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchProgress = void 0;
class SearchProgress {
    bot;
    constructor(bot) {
        this.bot = bot;
    }
    async getCounters() {
        const dashboard = await this.bot.browser.func.getDashboardData();
        return dashboard.dashboard.userStatus.counters;
    }
    async getMissing(isMobile) {
        return this.calculateMissing(await this.getCounters(), isMobile);
    }
    calculateMissing(counters, isMobile) {
        const quotas = this.calculateQuotas(counters);
        const mobilePoints = quotas.mobile.remaining;
        const desktopPoints = quotas.desktop.remaining;
        const edgePoints = quotas.edge.remaining;
        return {
            mobilePoints,
            desktopPoints,
            edgePoints,
            totalPoints: isMobile ? mobilePoints : desktopPoints + edgePoints
        };
    }
    calculateQuotas(counters) {
        const pcCounters = counters.pcSearch ?? [];
        const explicitEdgeCounters = pcCounters.filter(counter => this.isEdgeCounter(counter));
        const desktopCounters = explicitEdgeCounters.length
            ? pcCounters.filter(counter => !this.isEdgeCounter(counter))
            : pcCounters;
        return {
            mobile: this.summarize(counters.mobileSearch ?? []),
            desktop: this.summarize(desktopCounters),
            edge: this.summarize(explicitEdgeCounters)
        };
    }
    summarize(counters) {
        return counters.reduce((quota, counter) => {
            const max = Math.max(0, Number(counter.pointProgressMax) || 0);
            const earned = Math.min(max, Math.max(0, Number(counter.pointProgress) || 0));
            quota.earned += earned;
            quota.max += max;
            quota.remaining += max - earned;
            return quota;
        }, { earned: 0, max: 0, remaining: 0 });
    }
    isEdgeCounter(counter) {
        return [counter.offerId, counter.name, counter.title, counter.promotionSubtype].some(value => typeof value === 'string' && /(^|[_\s-])edge([_\s-]|$)/i.test(value));
    }
}
exports.SearchProgress = SearchProgress;
//# sourceMappingURL=SearchProgress.js.map