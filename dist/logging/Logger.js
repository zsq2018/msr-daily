"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
const cluster_1 = __importDefault(require("cluster"));
const Discord_1 = require("./Discord");
const Ntfy_1 = require("./Ntfy");
const Telegram_1 = require("./Telegram");
const ErrorDiagnostic_1 = require("../util/ErrorDiagnostic");
function platformText(platform) {
    return platform === 'main' ? 'MAIN' : platform ? 'MOBILE' : 'DESKTOP';
}
function platformBadge(platform) {
    return platform === 'main' ? chalk_1.default.bgCyan('MAIN') : platform ? chalk_1.default.bgBlue('MOBILE') : chalk_1.default.bgMagenta('DESKTOP');
}
function getColorFn(color) {
    return color && typeof chalk_1.default[color] === 'function' ? chalk_1.default[color] : null;
}
function consoleOut(level, msg, chalkFn) {
    const out = chalkFn ? chalkFn(msg) : msg;
    switch (level) {
        case 'warn':
            return console.warn(out);
        case 'error':
            return console.error(out);
        default:
            return console.log(out);
    }
}
function formatMessage(message) {
    if (!(message instanceof Error))
        return message.replace(/\r?\n/g, '\\n');
    const stackFrames = message.stack
        ?.split(/\r?\n/)
        .slice(1)
        .map(line => line.trim())
        .filter(Boolean)
        .join(' <- ');
    return stackFrames ? `${message.message} | stack=${stackFrames}` : message.message;
}
class Logger {
    bot;
    constructor(bot) {
        this.bot = bot;
    }
    info(isMobile, title, message, color) {
        return this.baseLog('info', isMobile, title, message, color);
    }
    warn(isMobile, title, message, color) {
        return this.baseLog('warn', isMobile, title, message, color);
    }
    error(isMobile, title, message, color) {
        return this.baseLog('error', isMobile, title, message, color);
    }
    debug(isMobile, title, message, color) {
        return this.baseLog('debug', isMobile, title, message, color);
    }
    baseLog(level, isMobile, title, message, color) {
        const config = this.bot.config;
        if (level === 'debug' && !config.debugLogs && !process.argv.includes('-dev'))
            return;
        const now = new Date().toLocaleString();
        const formatted = formatMessage(message);
        const userName = this.bot.userData.userName || 'MAIN';
        const levelTag = level.toUpperCase();
        const cleanMsg = `[${now}] [${userName}] [${levelTag}] ${platformText(isMobile)} [${title}] ${formatted}`;
        if (level === 'error' && config.errorDiagnostics) {
            const page = this.bot.isMobile ? this.bot.mainMobilePage : this.bot.mainDesktopPage;
            const error = message instanceof Error ? message : new Error(String(message));
            (0, ErrorDiagnostic_1.errorDiagnostic)(page, error);
        }
        const consoleAllowed = this.shouldPassFilter(config.consoleLogFilter, level, cleanMsg);
        const webhookAllowed = this.shouldPassFilter(config.webhook.webhookLogFilter, level, cleanMsg);
        if (consoleAllowed) {
            let logColor = color;
            if (!logColor) {
                if (level === 'error')
                    logColor = 'red';
                else if (level === 'warn')
                    logColor = 'yellow';
                else if (level === 'debug')
                    logColor = 'magenta';
            }
            const consoleStr = `[${now}] [${userName}] [${levelTag}] ${platformBadge(isMobile)} [${title}] ${formatted}`;
            consoleOut(level, consoleStr, getColorFn(logColor));
        }
        if (!webhookAllowed || level === 'debug')
            return;
        const hasWebhook = Boolean((config.webhook.discord?.enabled && config.webhook.discord.url) ||
            (config.webhook.ntfy?.enabled && config.webhook.ntfy.url) ||
            (config.webhook.telegram?.enabled && config.webhook.telegram.botToken && config.webhook.telegram.chatId));
        if (!hasWebhook)
            return;
        if (cluster_1.default.isPrimary) {
            if (config.webhook.discord?.enabled && config.webhook.discord.url) {
                (0, Discord_1.sendDiscord)(config.webhook.discord.url, cleanMsg, level);
            }
            if (config.webhook.ntfy?.enabled && config.webhook.ntfy.url) {
                (0, Ntfy_1.sendNtfy)(config.webhook.ntfy, cleanMsg, level);
            }
            if (config.webhook.telegram?.enabled &&
                config.webhook.telegram.botToken &&
                config.webhook.telegram.chatId) {
                (0, Telegram_1.sendTelegram)(config.webhook.telegram, cleanMsg, level);
            }
        }
        else {
            process.send?.({ __ipcLog: { content: cleanMsg, level } });
        }
    }
    shouldPassFilter(filter, level, message) {
        if (!filter || !filter.enabled) {
            return true;
        }
        const { mode, levels, keywords, regexPatterns } = filter;
        const hasLevelRule = Array.isArray(levels) && levels.length > 0;
        const hasKeywordRule = Array.isArray(keywords) && keywords.length > 0;
        const hasPatternRule = Array.isArray(regexPatterns) && regexPatterns.length > 0;
        if (!hasLevelRule && !hasKeywordRule && !hasPatternRule) {
            return mode === 'blacklist';
        }
        const lowerMessage = message.toLowerCase();
        let isMatch = false;
        if (hasLevelRule && levels.includes(level)) {
            isMatch = true;
        }
        if (!isMatch && hasKeywordRule) {
            if (keywords.some(k => lowerMessage.includes(k.toLowerCase()))) {
                isMatch = true;
            }
        }
        if (!isMatch && hasPatternRule) {
            for (const pattern of regexPatterns) {
                try {
                    const regex = new RegExp(pattern, 'i');
                    if (regex.test(message)) {
                        isMatch = true;
                        break;
                    }
                }
                catch { }
            }
        }
        return mode === 'whitelist' ? isMatch : !isMatch;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map