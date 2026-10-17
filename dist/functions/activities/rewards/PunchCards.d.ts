import { BaseActivity } from '../BaseActivity';
import type { DashboardData } from '../../../interface/DashboardData';
export declare class PunchCards extends BaseActivity {
    runMobile(data: DashboardData): Promise<void>;
    runDesktop(): Promise<void>;
    private run;
    private getParentQuests;
    private mergeApiParents;
    private solvePunchCard;
    private getQuestChildren;
    private reportQuestChild;
    private isSearchQuotaChild;
    private isClaimChild;
    private getAttribute;
}
//# sourceMappingURL=PunchCards.d.ts.map