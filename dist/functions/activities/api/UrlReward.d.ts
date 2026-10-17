import type { BasePromotion } from '../../../interface/DashboardData';
import { BaseActivity } from '../BaseActivity';
export declare class UrlReward extends BaseActivity {
    doUrlReward(promotion: BasePromotion): Promise<void>;
    private runUrlReward;
    private retryAfterRequestFailure;
}
//# sourceMappingURL=UrlReward.d.ts.map