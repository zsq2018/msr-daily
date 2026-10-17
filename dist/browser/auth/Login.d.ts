import type { Page } from 'patchright';
import type { MicrosoftRewardsBot } from '../../index';
import { EmailLogin } from './methods/EmailLogin';
import { PasswordlessLogin } from './methods/PasswordlessLogin';
import { TotpLogin } from './methods/Totp2FALogin';
import { CodeLogin } from './methods/GetACodeLogin';
import { RecoveryLogin } from './methods/RecoveryEmailLogin';
import type { Account } from '../../interface/Account';
export declare class Login {
    private bot;
    emailLogin: EmailLogin;
    passwordlessLogin: PasswordlessLogin;
    totp2FALogin: TotpLogin;
    codeLogin: CodeLogin;
    recoveryLogin: RecoveryLogin;
    private readonly capturedUnknownUrls;
    private signInMethodsLogged;
    private passwordlessMethodSelected;
    private readonly selectors;
    constructor(bot: MicrosoftRewardsBot);
    login(page: Page, account: Account): Promise<void>;
    private detectCurrentState;
    private checkSelector;
    private normalizeSignInText;
    private sanitizeSignInLabel;
    private getSignInMethodOptions;
    private classifySignInMethod;
    private clickSignInMethodOption;
    private logAvailableSignInMethods;
    private waitForIdle;
    private tryClick;
    private handleState;
    private finalizeLogin;
    verifyBingSession(page: Page, account: Account): Promise<void>;
    private getRewardsSession;
    getAppAccessToken(page: Page, email: string): Promise<string>;
}
//# sourceMappingURL=Login.d.ts.map