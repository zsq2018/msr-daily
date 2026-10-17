"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const patchright_1 = __importDefault(require("patchright"));
const fingerprint_injector_1 = require("fingerprint-injector");
const fingerprint_generator_1 = require("fingerprint-generator");
const SessionStore_1 = require("../util/SessionStore");
const Locale_1 = require("../util/Locale");
const Proxy_1 = require("../util/Proxy");
const UserAgent_1 = require("./UserAgent");
const MediaBlocker_1 = require("./MediaBlocker");
class Browser {
    bot;
    fingerprintGenerator = new fingerprint_generator_1.FingerprintGenerator();
    userAgentManager;
    static BROWSER_ARGS = [
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-web-authentication-ui',
        '--disable-external-intent-requests',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=WebAuthentication,PasswordManagerOnboarding,PasswordManager,EnablePasswordsAccountStorage,Passkeys,WebAuthenticationProxy,U2F',
        '--disable-save-password-bubble',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
    ];
    constructor(bot) {
        this.bot = bot;
        this.userAgentManager = new UserAgent_1.UserAgentManager(bot);
    }
    async createBrowser(account) {
        const headless = this.bot.config.headless;
        const hasProxy = Boolean(account.proxy.url);
        const ignoreCertificateErrors = hasProxy && this.bot.config.proxy.ignoreCertificateErrors;
        let browser;
        try {
            const proxyConfig = account.proxy.url
                ? {
                    server: (0, Proxy_1.formatBrowserProxyServer)(account.proxy.url, account.proxy.port),
                    ...(account.proxy.username &&
                        account.proxy.password && {
                        username: account.proxy.username,
                        password: account.proxy.password
                    })
                }
                : undefined;
            const runningAsRoot = typeof process.getuid === 'function' && process.getuid() === 0;
            const sandboxDisabled = process.platform === 'linux' && runningAsRoot;
            const sandboxArgs = sandboxDisabled ? ['--no-sandbox', '--disable-setuid-sandbox'] : [];
            const certArgs = ignoreCertificateErrors
                ? ['--ignore-certificate-errors', '--ignore-certificate-errors-spki-list', '--ignore-ssl-errors']
                : [];
            if (ignoreCertificateErrors) {
                this.bot.logger.warn(this.bot.isMobile, 'BROWSER-SECURITY', 'TLS certificate verification is disabled by proxy.ignoreCertificateErrors');
            }
            this.bot.logger.info(this.bot.isMobile, 'BROWSER', `Launching bundled patched Chromium (Edge UA) | headless=${headless} | platform=${process.platform} | proxy=${hasProxy ? 'yes' : 'no'} | tls=${ignoreCertificateErrors ? 'verification-disabled' : 'verified'} | sandbox=${sandboxDisabled ? 'disabled-root' : 'enabled'}`);
            browser = await patchright_1.default.chromium.launch({
                headless,
                ...(proxyConfig && { proxy: proxyConfig }),
                args: [...Browser.BROWSER_ARGS, ...sandboxArgs, ...certArgs]
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.bot.logger.error(this.bot.isMobile, 'BROWSER', `Browser launch failed: ${errorMessage}`);
            throw error;
        }
        try {
            const session = (0, SessionStore_1.loadSession)(this.bot.config.sessionPath, account.email, this.bot.isMobile);
            if (session?.storageState) {
                const ageMinutes = Math.max(0, Math.floor((Date.now() - session.updatedAt) / 60000));
                this.bot.logger.info(this.bot.isMobile, 'SESSION', `Restoring saved browser session | cookies=${session.storageState.cookies.length} | origins=${session.storageState.origins.length} | ageMinutes=${ageMinutes}`);
            }
            else {
                this.bot.logger.info(this.bot.isMobile, 'SESSION', 'No saved browser session found; login may be required');
            }
            const shouldUseFingerprint = this.bot.isMobile
                ? account.saveFingerprint.mobile
                : account.saveFingerprint.desktop;
            const savedFingerprint = shouldUseFingerprint ? session?.fingerprint : null;
            const reuseFingerprint = savedFingerprint && (0, Locale_1.fingerprintMatchesLocale)(savedFingerprint, this.bot.accountLocale);
            if (savedFingerprint && !reuseFingerprint) {
                this.bot.logger.info(this.bot.isMobile, 'BROWSER-FINGERPRINT', `Saved fingerprint locale does not match ${this.bot.accountLocale.locale}; generating a replacement`);
            }
            const fingerprint = (reuseFingerprint && savedFingerprint) || (await this.generateFingerprint(this.bot.isMobile));
            const screen = fingerprint.fingerprint.screen;
            //@ts-expect-error It doesn't like the browser instance from different packages
            const injected = await (0, fingerprint_injector_1.newInjectedContext)(browser, {
                fingerprint,
                newContextOptions: {
                    permissions: [],
                    ignoreHTTPSErrors: ignoreCertificateErrors,
                    // Restore cookies
                    ...(session?.storageState ? { storageState: session.storageState } : {}),
                    ...(this.bot.isMobile
                        ? {
                            isMobile: true,
                            hasTouch: true,
                            deviceScaleFactor: screen.devicePixelRatio,
                            viewport: { width: screen.width, height: screen.height },
                            screen: { width: screen.width, height: screen.height }
                        }
                        : {})
                }
            });
            const context = injected;
            if (hasProxy) {
                await context.addInitScript(() => {
                    // @ts-expect-error Chromium-specific runtime globals
                    delete window.RTCPeerConnection;
                    // @ts-expect-error Legacy Chromium runtime global
                    delete window.webkitRTCPeerConnection;
                    // @ts-expect-error Chromium-specific runtime global
                    delete window.RTCDataChannel;
                });
            }
            await (0, MediaBlocker_1.configureMediaBlocking)(this.bot, context);
            context.on('page', p => {
                p.on('crash', () => this.bot.logger.error(this.bot.isMobile, 'BROWSER', `Renderer crashed | ${p.url()}`));
            });
            context.on('close', () => this.bot.logger.warn(this.bot.isMobile, 'BROWSER', 'Browser context closed'));
            context.setDefaultTimeout(this.bot.utils.stringToNumber(this.bot.config?.globalTimeout ?? 30000));
            if (shouldUseFingerprint && !reuseFingerprint) {
                (0, SessionStore_1.saveFingerprint)(this.bot.config.sessionPath, account.email, this.bot.isMobile, fingerprint);
            }
            this.bot.logger.info(this.bot.isMobile, 'BROWSER', `Created context | locale=${this.bot.accountLocale.locale} | Accept-Language="${this.bot.accountLocale.acceptLanguage}" | User-Agent: "${fingerprint.fingerprint.navigator.userAgent}"`);
            this.bot.logger.debug(this.bot.isMobile, 'BROWSER-FINGERPRINT', JSON.stringify(fingerprint));
            return { context, fingerprint };
        }
        catch (error) {
            await browser.close().catch(() => { });
            throw error;
        }
    }
    async generateFingerprint(isMobile) {
        const hostOs = process.platform === 'darwin' ? 'macos' : process.platform === 'linux' ? 'linux' : 'windows';
        const fingerPrintData = this.fingerprintGenerator.getFingerprint({
            devices: isMobile ? ['mobile'] : ['desktop'],
            operatingSystems: isMobile ? ['android'] : [hostOs],
            browsers: [{ name: 'edge' }],
            locales: this.bot.accountLocale.acceptedLocales
        });
        return this.userAgentManager.updateFingerprintUserAgent(fingerPrintData, isMobile);
    }
}
exports.default = Browser;
//# sourceMappingURL=Browser.js.map