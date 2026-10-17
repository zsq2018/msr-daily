import type { Page } from 'patchright';
import type { MicrosoftRewardsBot } from '../../../index';
export declare class PasswordlessLogin {
    private bot;
    private readonly approvalTimeoutSeconds;
    private readonly maxRequestRetries;
    private readonly numberDisplaySelector;
    private readonly rngcMarkerSelector;
    private readonly shieldMarkerSelector;
    private readonly primaryButtonSelector;
    constructor(bot: MicrosoftRewardsBot);
    private isAttached;
    private getApprovalState;
    private getStableApprovalState;
    private getDisplayedNumber;
    private waitForApproval;
    private sendAnotherRequest;
    private logApprovalNumber;
    handle(page: Page): Promise<void>;
}
//# sourceMappingURL=PasswordlessLogin.d.ts.map