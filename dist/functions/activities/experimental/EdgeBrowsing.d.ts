import type { DashboardData } from '../../../interface/DashboardData';
import { BaseActivity } from '../BaseActivity';
export declare class EdgeBrowsing extends BaseActivity {
    run(data: DashboardData, signal?: AbortSignal): Promise<void>;
    private getEdgeProfile;
    private findStreak;
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
    private isEdgeBrowsingPartner;
    private findPromotion;
    private refreshServerCompletion;
    private logServerComplete;
    private resolveSettings;
    private submitReport;
    private getPlatformCookieHeader;
    private logProgress;
    private formatProgress;
    private wait;
}
//# sourceMappingURL=EdgeBrowsing.d.ts.map