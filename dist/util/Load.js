"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAccounts = loadAccounts;
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Validator_1 = require("./Validator");
let configCache;
let envLoaded = false;
function getProjectRoot() {
    const cwd = process.cwd();
    if (fs_1.default.existsSync(path_1.default.join(cwd, 'package.json')))
        return cwd;
    let dir = __dirname;
    while (dir !== path_1.default.parse(dir).root) {
        if (fs_1.default.existsSync(path_1.default.join(dir, 'package.json')))
            return dir;
        dir = path_1.default.dirname(dir);
    }
    return cwd;
}
// Check root -> dist -> src (not in dist, but root)
function resolveProjectFile(filename) {
    const root = getProjectRoot();
    const candidates = [
        path_1.default.join(process.cwd(), filename),
        path_1.default.join(root, filename),
        path_1.default.join(root, 'dist', filename),
        path_1.default.join(root, 'src', filename)
    ];
    return candidates.find(p => fs_1.default.existsSync(p));
}
function ensureEnvLoaded() {
    if (envLoaded)
        return;
    envLoaded = true;
    // Check root -> dist -> src (not in dist, but root)
    const envFile = resolveProjectFile('.env');
    if (!envFile)
        return;
    const raw = fs_1.default.readFileSync(envFile, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1)
            continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
function envStr(key) {
    const v = process.env[key];
    if (v === undefined)
        return undefined;
    const trimmed = v.trim();
    return trimmed.length ? trimmed : undefined;
}
function envBool(key, fallback) {
    const v = envStr(key);
    if (v === undefined)
        return fallback;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}
const deprecationWarned = new Set();
function envBoolWithLegacy(primary, legacy, fallback) {
    if (envStr(primary) !== undefined)
        return envBool(primary, fallback);
    if (envStr(legacy) !== undefined) {
        if (!deprecationWarned.has(legacy)) {
            deprecationWarned.add(legacy);
            console.warn(`[Accounts] ${legacy} is deprecated; rename it to ${primary}.`);
        }
        return envBool(legacy, fallback);
    }
    return fallback;
}
function envInt(key, fallback) {
    const v = envStr(key);
    if (v === undefined)
        return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
}
function buildProxy(index) {
    return {
        proxyHttp: envBoolWithLegacy(`ACCOUNT_${index}_PROXY_HTTP`, `ACCOUNT_${index}_PROXY_AXIOS`, false),
        url: envStr(`ACCOUNT_${index}_PROXY_URL`) ?? '',
        port: envInt(`ACCOUNT_${index}_PROXY_PORT`, 0),
        username: envStr(`ACCOUNT_${index}_PROXY_USERNAME`) ?? '',
        password: envStr(`ACCOUNT_${index}_PROXY_PASSWORD`) ?? ''
    };
}
function buildSaveFingerprint(index) {
    return {
        mobile: envBool(`ACCOUNT_${index}_SAVE_FINGERPRINT_MOBILE`, false),
        desktop: envBool(`ACCOUNT_${index}_SAVE_FINGERPRINT_DESKTOP`, false)
    };
}
function getAccountIndexes() {
    return Object.keys(process.env)
        .map(key => /^ACCOUNT_([1-9]\d*)_EMAIL$/.exec(key)?.[1])
        .filter((index) => Boolean(index && envStr(`ACCOUNT_${index}_EMAIL`)))
        .sort((a, b) => Number(a) - Number(b));
}
function loadAccounts() {
    try {
        ensureEnvLoaded();
        const accounts = [];
        for (const index of getAccountIndexes()) {
            const email = envStr(`ACCOUNT_${index}_EMAIL`);
            if (!email)
                continue;
            const password = envStr(`ACCOUNT_${index}_PASSWORD`) ?? '';
            accounts.push({
                email,
                password,
                totpSecret: envStr(`ACCOUNT_${index}_TOTP_SECRET`),
                recoveryEmail: envStr(`ACCOUNT_${index}_RECOVERY_EMAIL`) ?? '',
                geoLocale: envStr(`ACCOUNT_${index}_GEO_LOCALE`) ?? 'auto',
                langCode: envStr(`ACCOUNT_${index}_LANG_CODE`) ?? 'en',
                proxy: buildProxy(index),
                saveFingerprint: buildSaveFingerprint(index)
            });
        }
        if (!accounts.length) {
            throw new Error('No accounts found in environment. Set at least one ACCOUNT_N_EMAIL (see env.example).');
        }
        return (0, Validator_1.validateAccounts)(accounts);
    }
    catch (error) {
        if (error instanceof Error)
            throw error;
        throw new Error(String(error));
    }
}
function loadConfig() {
    try {
        if (configCache) {
            return configCache;
        }
        // Check root -> dist -> src (not in dist, but root)
        const configPath = resolveProjectFile('config.json');
        if (!configPath) {
            throw new Error('config.json not found - place it in the project root (dist/ and src/ are also searched as fallbacks)');
        }
        const config = fs_1.default.readFileSync(configPath, 'utf-8');
        const unverifiedConfig = JSON.parse(config);
        const configData = (0, Validator_1.validateConfig)(unverifiedConfig);
        configCache = configData;
        return configData;
    }
    catch (error) {
        if (error instanceof Error)
            throw error;
        throw new Error(String(error));
    }
}
//# sourceMappingURL=Load.js.map