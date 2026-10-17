import type { MicrosoftRewardsBot } from '../../../index';
export interface BingSearchReport {
    ig: string | null;
    balance: number | null;
    previousBalance: number | null;
    gained: number | null;
    searchPointsEarned: number | null;
    searchPointsLimit: number | null;
}
export declare class BingSearchApi {
    private readonly bot;
    private readonly cookieJar;
    constructor(bot: MicrosoftRewardsBot);
    report(query: string, options?: {
        cvid?: string;
        cg?: string;
    }): Promise<BingSearchReport>;
    private readIg;
    private mergeCookies;
    private cookieHeader;
    private parseReport;
    private emptyReport;
}
//# sourceMappingURL=BingSearchApi.d.ts.map