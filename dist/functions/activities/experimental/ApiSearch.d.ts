import { BaseActivity } from '../BaseActivity';
export declare class ApiSearch extends BaseActivity {
    private readonly searchApi;
    private readonly searchProgress;
    doSearch(isMobile: boolean): Promise<number>;
    doBonusSearches(): Promise<number>;
}
//# sourceMappingURL=ApiSearch.d.ts.map