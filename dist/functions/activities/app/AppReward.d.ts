import type { Promotion } from '../../../interface/AppDashBoardData';
import { BaseActivity } from '../BaseActivity';
export declare class AppReward extends BaseActivity {
    private gainedPoints;
    private oldBalance;
    doAppReward(promotion: Promotion): Promise<void>;
}
//# sourceMappingURL=AppReward.d.ts.map