import type { Page } from 'patchright';
import { BaseActivity } from '../BaseActivity';
import type { BasePromotion } from '../../../interface/DashboardData';
export declare class SearchOnBing extends BaseActivity {
    private gainedPoints;
    private success;
    private oldBalance;
    doSearchOnBing(promotion: BasePromotion, page: Page): Promise<void>;
    private searchBing;
    private ensureSearchReady;
    private typeSearch;
}
//# sourceMappingURL=BrowserSearchOnBing.d.ts.map