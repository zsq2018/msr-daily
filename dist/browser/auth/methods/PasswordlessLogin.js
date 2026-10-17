"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordlessLogin = void 0;
class PasswordlessLogin {
    bot;
    approvalTimeoutSeconds = 60;
    maxRequestRetries = 1;
    numberDisplaySelector = '[data-testid="displaySign"]';
    rngcMarkerSelector = '[data-testid="psRNGCDefaultType"]';
    shieldMarkerSelector = '[data-testid="deviceShieldCheckmarkVideo"]';
    primaryButtonSelector = 'button[data-testid="primaryButton"]';
    constructor(bot) {
        this.bot = bot;
    }
    async isAttached(page, selector) {
        return page
            .locator(selector)
            .count()
            .then(count => count > 0)
            .catch(() => false);
    }
    async getApprovalState(page) {
        const [hasRngcMarker, hasNumber, hasShield, hasPrimaryButton] = await Promise.all([
            this.isAttached(page, this.rngcMarkerSelector),
            this.isAttached(page, this.numberDisplaySelector),
            this.isAttached(page, this.shieldMarkerSelector),
            page
                .locator(this.primaryButtonSelector)
                .isVisible()
                .catch(() => false)
        ]);
        if (hasRngcMarker && hasPrimaryButton && !hasNumber && !hasShield)
            return 'RETRY_AVAILABLE';
        if (!hasRngcMarker && !hasNumber && !hasShield)
            return 'APPROVED';
        return 'PENDING';
    }
    async getStableApprovalState(page) {
        const state = await this.getApprovalState(page);
        if (state !== 'APPROVED')
            return state;
        await this.bot.utils.wait(500);
        return this.getApprovalState(page);
    }
    async getDisplayedNumber(page) {
        try {
            const numberElement = await page
                .waitForSelector(this.numberDisplaySelector, {
                state: 'visible',
                timeout: 5000
            })
                .catch(() => null);
            if (numberElement) {
                const number = await numberElement.textContent();
                return number?.trim() || null;
            }
        }
        catch {
            this.bot.logger.warn(this.bot.isMobile, 'LOGIN-PASSWORDLESS', 'Could not retrieve displayed number');
        }
        return null;
    }
    async waitForApproval(page) {
        this.bot.logger.info(this.bot.isMobile, 'LOGIN-PASSWORDLESS', `Waiting for approval... (timeout after ${this.approvalTimeoutSeconds} seconds)`);
        for (let elapsed = 1; elapsed <= this.approvalTimeoutSeconds; elapsed++) {
            const state = await this.getStableApprovalState(page);
            if (state === 'APPROVED') {
                this.bot.logger.info(this.bot.isMobile, 'LOGIN-PASSWORDLESS', 'Approval detected');
                return state;
            }
            if (state === 'RETRY_AVAILABLE')
                return state;
            if (elapsed % 5 === 0) {
                this.bot.logger.debug(this.bot.isMobile, 'LOGIN-PASSWORDLESS', `Still waiting... (${elapsed}/${this.approvalTimeoutSeconds} seconds elapsed)`);
            }
            await this.bot.utils.wait(1000);
        }
        for (let gracePeriod = 0; gracePeriod < 5; gracePeriod++) {
            const state = await this.getStableApprovalState(page);
            if (state !== 'PENDING')
                return state;
            await this.bot.utils.wait(1000);
        }
        this.bot.logger.warn(this.bot.isMobile, 'LOGIN-PASSWORDLESS', `Approval timeout after ${this.approvalTimeoutSeconds} seconds!`);
        return 'TIMED_OUT';
    }
    async sendAnotherRequest(page) {
        if ((await this.getApprovalState(page)) !== 'RETRY_AVAILABLE')
            return false;
        const clicked = await this.bot.browser.utils.ghostClick(page, this.primaryButtonSelector);
        if (!clicked)
            return false;
        const numberElement = await page
            .waitForSelector(this.numberDisplaySelector, {
            state: 'visible',
            timeout: 10000
        })
            .catch(() => null);
        return numberElement !== null;
    }
    async logApprovalNumber(page) {
        const displayedNumber = await this.getDisplayedNumber(page);
        if (displayedNumber) {
            this.bot.logger.info(this.bot.isMobile, 'LOGIN-PASSWORDLESS', `Please approve login and select number: ${displayedNumber}`, 'yellowBright');
            return;
        }
        this.bot.logger.info(this.bot.isMobile, 'LOGIN-PASSWORDLESS', 'Please approve login on your authenticator app', 'yellowBright');
    }
    async handle(page) {
        try {
            this.bot.logger.info(this.bot.isMobile, 'LOGIN-PASSWORDLESS', 'Passwordless authentication requested');
            for (let retry = 0; retry <= this.maxRequestRetries; retry++) {
                await this.logApprovalNumber(page);
                const state = await this.waitForApproval(page);
                if (state === 'APPROVED') {
                    this.bot.logger.info(this.bot.isMobile, 'LOGIN-PASSWORDLESS', 'Login approved successfully');
                    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });
                    return;
                }
                if (state === 'RETRY_AVAILABLE' && retry < this.maxRequestRetries) {
                    this.bot.logger.warn(this.bot.isMobile, 'LOGIN-PASSWORDLESS', `Approval request expired; sending retry ${retry + 1}/${this.maxRequestRetries}`);
                    if (await this.sendAnotherRequest(page))
                        continue;
                    throw new Error('Could not send another passwordless authentication request');
                }
                throw new Error('Passwordless authentication timeout');
            }
        }
        catch (error) {
            this.bot.logger.error(this.bot.isMobile, 'LOGIN-PASSWORDLESS', `An error occurred: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}
exports.PasswordlessLogin = PasswordlessLogin;
//# sourceMappingURL=PasswordlessLogin.js.map