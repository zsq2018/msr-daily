import type { Dashboard, DashboardData } from '../../../interface/DashboardData';
import { BaseActivity } from '../BaseActivity';
export interface SearchMultiplierPerk {
    offerId: string;
    multiplier: number;
}
export declare function detectSearchMultiplierPerk(dashboard: Dashboard): SearchMultiplierPerk | null;
export declare class ActivateSearchPerk extends BaseActivity {
    activate(data: DashboardData): Promise<void>;
}
//# sourceMappingURL=ActivateSearchPerk.d.ts.map