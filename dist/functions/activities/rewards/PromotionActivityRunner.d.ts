import { BaseActivity } from '../BaseActivity';
import type { BasePromotion } from '../../../interface/DashboardData';
export declare class PromotionActivityRunner extends BaseActivity {
    run(promotions: BasePromotion[]): Promise<void>;
    private runPromotion;
    private logDisabled;
}
//# sourceMappingURL=PromotionActivityRunner.d.ts.map