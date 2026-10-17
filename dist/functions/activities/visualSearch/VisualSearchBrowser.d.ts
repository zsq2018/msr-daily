import type { MicrosoftRewardsBot } from '../../../index';
export interface VisualSearchCandidate {
    bcid: string;
    query: string;
    serpUrl: string;
}
export interface VisualSearchReport {
    acknowledged: boolean;
    ig: string | null;
    balance: number | null;
    previousBalance: number | null;
    gained: number | null;
    searchPointsEarned: number | null;
    searchPointsLimit: number | null;
}
export declare class VisualSearchBrowser {
    private readonly bot;
    constructor(bot: MicrosoftRewardsBot);
    report(candidate: VisualSearchCandidate): Promise<VisualSearchReport>;
    acquire(imageUrl?: string): Promise<VisualSearchCandidate | null>;
    getSeedUrls(): Promise<string[]>;
    private buildMultipart;
    private parseRedirect;
    private parseReport;
    private emptyReport;
    private emptyParsedReport;
}
//# sourceMappingURL=VisualSearchBrowser.d.ts.map