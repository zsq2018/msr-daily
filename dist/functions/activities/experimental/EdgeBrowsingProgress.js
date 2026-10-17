"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeBrowsingProgress = void 0;
const node_perf_hooks_1 = require("node:perf_hooks");
class EdgeBrowsingProgress {
    targetMinutes;
    intervalMinutes;
    delays;
    startedAt = node_perf_hooks_1.performance.now();
    constructor(targetMinutes, intervalMinutes, delays) {
        this.targetMinutes = targetMinutes;
        this.intervalMinutes = intervalMinutes;
        this.delays = delays;
    }
    get reportsTotal() {
        return this.delays.length;
    }
    get estimatedDurationMinutes() {
        return this.toMinutes(this.sum(this.delays));
    }
    snapshot(reportsCompleted) {
        const completed = Math.min(Math.max(0, reportsCompleted), this.reportsTotal);
        const remainingMs = this.sum(this.delays.slice(completed));
        const nextDelay = this.delays[completed];
        return {
            reportsCompleted: completed,
            reportsTotal: this.reportsTotal,
            reportsRemaining: this.reportsTotal - completed,
            scheduledMinutesCovered: Math.min(this.targetMinutes, completed * this.intervalMinutes),
            nextReportInSeconds: nextDelay === undefined ? null : this.round(nextDelay / 1000),
            elapsedMinutes: this.toMinutes(node_perf_hooks_1.performance.now() - this.startedAt),
            estimatedRemainingMinutes: this.toMinutes(remainingMs)
        };
    }
    delayBeforeReport(reportNumber) {
        return this.delays[reportNumber - 1] ?? 0;
    }
    sum(values) {
        return values.reduce((total, value) => total + value, 0);
    }
    toMinutes(milliseconds) {
        return this.round(milliseconds / 60_000);
    }
    round(value) {
        return Math.round(value * 10) / 10;
    }
}
exports.EdgeBrowsingProgress = EdgeBrowsingProgress;
//# sourceMappingURL=EdgeBrowsingProgress.js.map