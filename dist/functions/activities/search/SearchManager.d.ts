import { MicrosoftRewardsBot } from '../../../index';
import type { Account } from '../../../interface/Account';
interface SearchPlan {
    doMobile: boolean;
    doDesktop: boolean;
    mobileMissing: number;
    desktopMissing: number;
}
export declare class SearchManager {
    private bot;
    private readonly progress;
    constructor(bot: MicrosoftRewardsBot);
    getSearchPoints(): Promise<SearchPlan>;
    private combineQuotas;
    private describeQuota;
    searchMobile(account: Account): Promise<number>;
    searchDesktop(account: Account): Promise<number>;
    private search;
    bonusMobile(account: Account): Promise<number>;
}
export {};
//# sourceMappingURL=SearchManager.d.ts.map