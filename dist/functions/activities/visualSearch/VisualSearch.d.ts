import { BaseActivity } from '../BaseActivity';
import type { DashboardData } from '../../../interface/DashboardData';
export declare class VisualSearch extends BaseActivity {
    private readonly browserFlow;
    doVisualSearch(data: DashboardData): Promise<number>;
    private findStreak;
    private logStreakState;
    private activate;
    private confirmActivation;
    private resolveDashboard;
    private resolveActivationMetadata;
    private findDashboardPromotion;
    private dashboardPromotionActivityType;
    private dashboardPromotionIsPromotional;
    private parseActivityType;
    private asRecord;
    private findActivationTarget;
    private performDailySearch;
    private acquireFreshVisualSearch;
    private waitForDayRegistration;
    private dayRegistered;
}
//# sourceMappingURL=VisualSearch.d.ts.map