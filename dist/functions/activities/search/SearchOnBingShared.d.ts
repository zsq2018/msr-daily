import type { BasePromotion, Dashboard } from '../../../interface/DashboardData';
import type { MicrosoftRewardsBot } from '../../../index';
export declare function activateSearchOnBing(bot: MicrosoftRewardsBot, promotion: BasePromotion): Promise<boolean>;
export declare function findSearchOnBingOffer(dashboard: Dashboard, offerId: string): BasePromotion | undefined;
export declare function getSearchOnBingQueries(bot: MicrosoftRewardsBot, promotion: BasePromotion): Promise<string[]>;
//# sourceMappingURL=SearchOnBingShared.d.ts.map