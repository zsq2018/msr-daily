export interface EdgeBrowsingProgressSnapshot {
    reportsCompleted: number;
    reportsTotal: number;
    reportsRemaining: number;
    scheduledMinutesCovered: number;
    nextReportInSeconds: number | null;
    elapsedMinutes: number;
    estimatedRemainingMinutes: number;
}
export declare class EdgeBrowsingProgress {
    private readonly targetMinutes;
    private readonly intervalMinutes;
    private readonly delays;
    private readonly startedAt;
    constructor(targetMinutes: number, intervalMinutes: number, delays: readonly number[]);
    get reportsTotal(): number;
    get estimatedDurationMinutes(): number;
    snapshot(reportsCompleted: number): EdgeBrowsingProgressSnapshot;
    delayBeforeReport(reportNumber: number): number;
    private sum;
    private toMinutes;
    private round;
}
//# sourceMappingURL=EdgeBrowsingProgress.d.ts.map