import type { Page } from 'patchright';
import { BaseActivity } from '../BaseActivity';
export declare class Search extends BaseActivity {
    private searchCount;
    doSearch(page: Page, isMobile: boolean): Promise<number>;
    doBonusSearches(page: Page): Promise<number>;
    private runSearchSession;
    private bingSearch;
    private randomScroll;
    private clickRandomLink;
}
//# sourceMappingURL=BrowserSearch.d.ts.map