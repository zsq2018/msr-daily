import { BaseActivity } from '../BaseActivity';
import type { BasePromotion } from '../../../interface/DashboardData';
export declare class ApiSearchOnBing extends BaseActivity {
    private readonly searchApi;
    private gainedPoints;
    private success;
    private oldBalance;
    doSearchOnBing(promotion: BasePromotion): Promise<void>;
    private searchBing;
    private buildCategoryGroup;
}
//# sourceMappingURL=ApiSearchOnBing.d.ts.map