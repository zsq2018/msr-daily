"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountSchema = exports.ConfigSchema = void 0;
exports.validateConfig = validateConfig;
exports.validateAccounts = validateAccounts;
exports.checkNodeVersion = checkNodeVersion;
const zod_1 = require("zod");
const semver_1 = __importDefault(require("semver"));
const ms_1 = __importDefault(require("ms"));
const package_json_1 = __importDefault(require("../../package.json"));
const Locale_1 = require("./Locale");
const Proxy_1 = require("./Proxy");
const NumberOrString = zod_1.z.union([zod_1.z.number(), zod_1.z.string()]);
const LogFilterSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    mode: zod_1.z.enum(['whitelist', 'blacklist']),
    levels: zod_1.z.array(zod_1.z.enum(['debug', 'info', 'warn', 'error'])).optional(),
    keywords: zod_1.z.array(zod_1.z.string()).optional(),
    regexPatterns: zod_1.z.array(zod_1.z.string()).optional()
});
function durationToMs(value) {
    return typeof value === 'number' ? value : (0, ms_1.default)(value);
}
const DurationValue = NumberOrString.refine(value => {
    const parsed = durationToMs(value);
    return parsed !== undefined && Number.isFinite(parsed) && parsed >= 0;
}, 'Expected a non-negative duration');
const DelaySchema = zod_1.z
    .object({
    min: DurationValue,
    max: DurationValue
})
    .superRefine((delay, ctx) => {
    const min = durationToMs(delay.min);
    const max = durationToMs(delay.max);
    if (min !== undefined && max !== undefined && max < min) {
        ctx.addIssue({
            code: 'custom',
            message: 'Maximum delay must be greater than or equal to minimum delay'
        });
    }
});
const QueryEngineSchema = zod_1.z.union([
    zod_1.z.enum(['google', 'wikipedia', 'wikirandom', 'hackernews', 'reddit', 'local']),
    zod_1.z
        .string()
        .regex(/^rss(\.[A-Za-z0-9_-]+){0,2}$/, 'Invalid rss selector (use rss, rss.<site>, or rss.<site>.<endpoint>)')
]);
const AccountLanguageSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .refine(value => {
    try {
        (0, Locale_1.normalizeLanguageTag)(value);
        return true;
    }
    catch {
        return false;
    }
}, 'Expected a valid BCP 47 language tag')
    .transform(Locale_1.normalizeLanguageTag);
const AccountCountrySchema = zod_1.z
    .string()
    .trim()
    .transform(value => (value.toLowerCase() === 'auto' ? 'auto' : value.toUpperCase()))
    .refine(value => value === 'auto' || (0, Locale_1.normalizeCountry)(value) !== undefined, 'Expected "auto" or a two-letter country code');
const WebhookSchema = zod_1.z.object({
    discord: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        url: zod_1.z.string()
    })
        .optional(),
    ntfy: zod_1.z
        .object({
        enabled: zod_1.z.boolean().optional(),
        url: zod_1.z.string(),
        topic: zod_1.z.string().optional(),
        token: zod_1.z.string().optional(),
        title: zod_1.z.string().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        priority: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3), zod_1.z.literal(4), zod_1.z.literal(5)]).optional()
    })
        .optional(),
    telegram: zod_1.z
        .object({
        enabled: zod_1.z.boolean().optional(),
        botToken: zod_1.z.string(),
        chatId: zod_1.z.string()
    })
        .optional(),
    webhookLogFilter: LogFilterSchema
});
exports.ConfigSchema = zod_1.z.object({
    sessionPath: zod_1.z.string(),
    headless: zod_1.z.boolean(),
    clusters: zod_1.z.number().int().nonnegative(),
    errorDiagnostics: zod_1.z.boolean(),
    ensureStreakProtection: zod_1.z.boolean(),
    autoClaimPunchcardRewards: zod_1.z.boolean(),
    contintueOnBotWarning: zod_1.z.boolean().default(false),
    skipNonPointTasks: zod_1.z.boolean().default(true),
    accountDelay: DelaySchema.default({ min: '1min', max: '3min' }),
    workers: zod_1.z.object({
        doDailySet: zod_1.z.boolean(),
        doMorePromotions: zod_1.z.boolean(),
        doClaimBonusPoints: zod_1.z.boolean(),
        doPunchCards: zod_1.z.boolean(),
        doAppPromotions: zod_1.z.boolean(),
        doDesktopSearch: zod_1.z.boolean(),
        doMobileSearch: zod_1.z.boolean(),
        doBonusSearches: zod_1.z.boolean(),
        doDailyCheckIn: zod_1.z.boolean(),
        doReadToEarn: zod_1.z.boolean(),
        doActivateSearchPerk: zod_1.z.boolean(),
        doVisualSearch: zod_1.z.boolean().default(false)
    }),
    activities: zod_1.z
        .object({
        urlReward: zod_1.z.boolean().default(true),
        searchOnBing: zod_1.z.boolean().default(true)
    })
        .default({ urlReward: true, searchOnBing: true }),
    searchOnBingLocalQueries: zod_1.z.boolean(),
    globalTimeout: NumberOrString,
    searchSettings: zod_1.z.object({
        scrollRandomResults: zod_1.z.boolean(),
        clickRandomResults: zod_1.z.boolean(),
        runOnZeroPoints: zod_1.z.boolean().default(false),
        maxBonusSearches: zod_1.z.number().default(110),
        parallelSearching: zod_1.z.boolean(),
        clusterSearch: zod_1.z.boolean().default(true),
        queryEngines: zod_1.z.array(QueryEngineSchema),
        searchResultVisitTime: NumberOrString,
        searchDelay: DelaySchema,
        readDelay: DelaySchema
    }),
    experimental: zod_1.z
        .object({
        apiSearch: zod_1.z.boolean().default(false),
        apiSearchOnBing: zod_1.z.boolean().default(false),
        blockMedia: zod_1.z.boolean().default(false),
        edgeBrowsing: zod_1.z.boolean().default(false)
    })
        .default({ apiSearch: false, apiSearchOnBing: false, blockMedia: false, edgeBrowsing: false }),
    debugLogs: zod_1.z.boolean(),
    proxy: zod_1.z.object({
        queryEngine: zod_1.z.boolean(),
        ignoreCertificateErrors: zod_1.z.boolean().default(false)
    }),
    consoleLogFilter: LogFilterSchema,
    webhook: WebhookSchema
});
const AccountProxySchema = zod_1.z
    .object({
    proxyHttp: zod_1.z.boolean(),
    url: zod_1.z.string(),
    port: zod_1.z.number(),
    password: zod_1.z.string(),
    username: zod_1.z.string()
})
    .superRefine((proxy, ctx) => {
    const hasUrl = proxy.url.trim().length > 0;
    const hasUsername = proxy.username.length > 0;
    const hasPassword = proxy.password.length > 0;
    if (!hasUrl) {
        if (proxy.proxyHttp || proxy.port !== 0 || hasUsername || hasPassword) {
            ctx.addIssue({
                code: 'custom',
                path: ['url'],
                message: 'Proxy URL is required when other proxy settings are configured'
            });
        }
        return;
    }
    let url;
    try {
        url = (0, Proxy_1.parseBrowserProxyUrl)(proxy.url);
    }
    catch (error) {
        ctx.addIssue({
            code: 'custom',
            path: ['url'],
            message: error instanceof Error ? error.message : String(error)
        });
        return;
    }
    if (!Number.isInteger(proxy.port) || proxy.port < 1 || proxy.port > 65535) {
        ctx.addIssue({
            code: 'custom',
            path: ['port'],
            message: 'Proxy port must be an integer from 1 to 65535'
        });
    }
    if (url.username || url.password) {
        ctx.addIssue({
            code: 'custom',
            path: ['url'],
            message: 'Put proxy credentials in the username/password fields, not in the proxy URL'
        });
    }
    if (hasUsername !== hasPassword) {
        ctx.addIssue({
            code: 'custom',
            path: hasUsername ? ['password'] : ['username'],
            message: 'Proxy username and password must be configured together'
        });
    }
    if ((url.protocol === 'socks4:' || url.protocol === 'socks5:') && (hasUsername || hasPassword)) {
        ctx.addIssue({
            code: 'custom',
            path: ['username'],
            message: `${url.protocol.slice(0, -1).toUpperCase()} proxy authentication is not supported by Patchright`
        });
    }
});
exports.AccountSchema = zod_1.z.object({
    email: zod_1.z.string(),
    password: zod_1.z.string(),
    totpSecret: zod_1.z.string().optional(),
    recoveryEmail: zod_1.z.string(),
    geoLocale: AccountCountrySchema,
    langCode: AccountLanguageSchema,
    proxy: AccountProxySchema,
    saveFingerprint: zod_1.z.object({
        mobile: zod_1.z.boolean(),
        desktop: zod_1.z.boolean()
    })
});
const defaultConfig = {
    sessionPath: 'sessions',
    headless: true,
    clusters: 1,
    errorDiagnostics: true,
    ensureStreakProtection: true,
    autoClaimPunchcardRewards: false,
    contintueOnBotWarning: false,
    skipNonPointTasks: true,
    accountDelay: { min: '1min', max: '3min' },
    workers: {
        doDailySet: true,
        doMorePromotions: true,
        doClaimBonusPoints: true,
        doPunchCards: true,
        doAppPromotions: true,
        doDesktopSearch: true,
        doMobileSearch: true,
        doBonusSearches: false,
        doDailyCheckIn: true,
        doReadToEarn: true,
        doActivateSearchPerk: true,
        doVisualSearch: false
    },
    activities: {
        urlReward: true,
        searchOnBing: true
    },
    searchOnBingLocalQueries: false,
    globalTimeout: '30sec',
    searchSettings: {
        scrollRandomResults: true,
        clickRandomResults: true,
        runOnZeroPoints: false,
        maxBonusSearches: 110,
        parallelSearching: true,
        clusterSearch: true,
        queryEngines: ['google', 'wikipedia', 'wikirandom', 'hackernews', 'reddit', 'local'],
        searchResultVisitTime: '10sec',
        searchDelay: { min: '30sec', max: '1min' },
        readDelay: { min: '30sec', max: '1min' }
    },
    experimental: {
        apiSearch: false,
        apiSearchOnBing: false,
        blockMedia: false,
        edgeBrowsing: false
    },
    debugLogs: false,
    proxy: { queryEngine: true, ignoreCertificateErrors: false },
    consoleLogFilter: {
        enabled: false,
        mode: 'whitelist',
        levels: ['info', 'warn', 'error'],
        keywords: [],
        regexPatterns: []
    },
    webhook: {
        webhookLogFilter: {
            enabled: false,
            mode: 'whitelist',
            levels: ['warn', 'error'],
            keywords: [],
            regexPatterns: []
        }
    }
};
function isPlainObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function getByPath(obj, path) {
    return path.reduce((acc, key) => {
        if (acc == null)
            return undefined;
        return acc[key];
    }, obj);
}
function setByPath(obj, path, value) {
    if (path.length === 0)
        return value;
    const head = path[0];
    if (head === undefined)
        return value;
    const rest = path.slice(1);
    const base = obj ?? (typeof head === 'number' ? [] : {});
    const cloned = (Array.isArray(base) ? [...base] : { ...base });
    cloned[head] = setByPath(base[head], rest, value);
    return cloned;
}
function fillMissing(data, defaults, path = '') {
    if (!isPlainObject(defaults))
        return data;
    if (!isPlainObject(data)) {
        if (data === undefined) {
            console.warn(`[Config] WARN: "${path || '<root>'}" missing, using default`);
            return defaults;
        }
        return data;
    }
    const result = { ...data };
    for (const key of Object.keys(defaults)) {
        const p = path ? `${path}.${key}` : key;
        if (!(key in result)) {
            console.warn(`[Config] WARN: "${p}" not found, using default: ${JSON.stringify(defaults[key])}`);
            result[key] = defaults[key];
        }
        else if (isPlainObject(defaults[key])) {
            result[key] = fillMissing(result[key], defaults[key], p);
        }
    }
    return result;
}
function validateConfig(data) {
    const filled = fillMissing(data, defaultConfig);
    let result = exports.ConfigSchema.safeParse(filled);
    if (result.success)
        return result.data;
    let patched = filled;
    for (const issue of result.error.issues) {
        const def = getByPath(defaultConfig, issue.path);
        console.warn(`[Config] WARN: "${issue.path.join('.') || '<root>'}" invalid (${issue.message}), using default: ${JSON.stringify(def)}`);
        patched = setByPath(patched, issue.path, def);
    }
    result = exports.ConfigSchema.safeParse(patched);
    if (!result.success) {
        console.error('[Config] still invalid after applying defaults:', result.error.issues);
        throw new Error('Config validation failed');
    }
    return result.data;
}
function validateAccounts(data) {
    const result = zod_1.z.array(exports.AccountSchema).safeParse(data);
    if (result.success)
        return result.data;
    for (const issue of result.error.issues) {
        const path = issue.path.join('.') || '<root>';
        if (issue.code === 'invalid_type') {
            if (issue.input === undefined) {
                console.error(`[Accounts] "${path}" is missing (expected ${issue.expected})`);
            }
            else {
                console.error(`[Accounts] "${path}" has wrong type: expected ${issue.expected}, got ${typeof issue.input}`);
            }
        }
        else if (issue.code === 'invalid_union') {
            console.error(`[Accounts] "${path}" does not match any allowed type: ${issue.message}`);
        }
        else {
            console.error(`[Accounts] "${path}" ${issue.message} (code: ${issue.code})`);
        }
    }
    throw new Error(`Accounts validation failed: ${result.error.issues.length} issue(s) - see logs above`);
}
function checkNodeVersion() {
    try {
        const requiredVersion = package_json_1.default.engines?.node;
        if (!requiredVersion) {
            console.warn('[Validator] WARN: No Node.js version requirement found in package.json "engines" field.');
            return;
        }
        if (!semver_1.default.satisfies(process.version, requiredVersion)) {
            console.error(`Current Node.js version ${process.version} does not satisfy requirement: ${requiredVersion}`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Failed to validate Node.js version:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=Validator.js.map