import type { MicrosoftRewardsBot } from '../index';
import type { Page } from 'patchright';
import type { BasePromotion, DashboardData } from '../interface/DashboardData';
import type { AppDashboardData, Promotion } from '../interface/AppDashBoardData';
import type { QuestChild } from '../browser/ReactFunc';
export default class Activities {
    private bot;
    constructor(bot: MicrosoftRewardsBot);
    doSearch: (page: Page, isMobile: boolean) => Promise<number>;
    doBonusSearches: (page: Page) => Promise<number>;
    doSearchOnBing: (promotion: BasePromotion, page: Page) => Promise<void>;
    doDailySet: (data: DashboardData) => Promise<void>;
    doMorePromotions: (data: DashboardData) => Promise<void>;
    doPunchCardsMobile: (data: DashboardData) => Promise<void>;
    doPunchCardsDesktop: () => Promise<void>;
    doUrlReward: (promotion: BasePromotion) => Promise<void>;
    doClaimBonusPoints: () => Promise<void>;
    doEnsureStreakProtection: () => Promise<void>;
    doClaimReward: (child: QuestChild, parentId: string) => Promise<void>;
    doActivateSearchPerk: (data: DashboardData) => Promise<void>;
    doVisualSearch: (data: DashboardData) => Promise<number>;
    doAppReward: (promotion: Promotion) => Promise<void>;
    doReadToEarn: () => Promise<void>;
    doDailyCheckIn: () => Promise<void>;
    doAppPromotions: (data: AppDashboardData) => Promise<void>;
    doEdgeBrowsing: (data: DashboardData, signal?: AbortSignal) => Promise<void>;
}
//# sourceMappingURL=Activities.d.ts.map