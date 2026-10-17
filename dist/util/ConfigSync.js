"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectRoot = getProjectRoot;
exports.resolveConfigPath = resolveConfigPath;
exports.resolveExamplePath = resolveExamplePath;
exports.readJson = readJson;
exports.writeConfigAtomic = writeConfigAtomic;
exports.diffKeyPaths = diffKeyPaths;
exports.mergeMissingDefaults = mergeMissingDefaults;
exports.syncConfig = syncConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getProjectRoot(startDir = process.cwd()) {
    if (fs_1.default.existsSync(path_1.default.join(startDir, 'package.json')))
        return startDir;
    let dir = startDir;
    while (dir !== path_1.default.parse(dir).root) {
        if (fs_1.default.existsSync(path_1.default.join(dir, 'package.json')))
            return dir;
        dir = path_1.default.dirname(dir);
    }
    return startDir;
}
function resolveProjectFile(filename, projectRoot) {
    const candidates = [
        path_1.default.join(process.cwd(), filename),
        path_1.default.join(projectRoot, filename),
        path_1.default.join(projectRoot, 'dist', filename),
        path_1.default.join(projectRoot, 'src', filename)
    ];
    return candidates.find(p => fs_1.default.existsSync(p));
}
function resolveConfigPath(projectRoot = getProjectRoot()) {
    return resolveProjectFile('config.json', projectRoot) ?? path_1.default.join(projectRoot, 'config.json');
}
function resolveExamplePath(projectRoot = getProjectRoot()) {
    return resolveProjectFile('config.example.json', projectRoot) ?? path_1.default.join(projectRoot, 'config.example.json');
}
function readJson(filePath) {
    return JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
}
function writeConfigAtomic(targetPath, cfg, opts = {}) {
    const backup = opts.backup ?? true;
    let backupPath;
    if (backup && fs_1.default.existsSync(targetPath)) {
        backupPath = `${targetPath}.bak`;
        try {
            fs_1.default.copyFileSync(targetPath, backupPath);
        }
        catch {
            backupPath = undefined; // best-effort backup; don't fail the sync over it
        }
    }
    const tmp = `${targetPath}.${process.pid}.tmp`;
    fs_1.default.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n');
    fs_1.default.renameSync(tmp, targetPath);
    return { backupPath };
}
function isPlainObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function diffKeyPaths(config, example, prefix = '') {
    if (!isPlainObject(example))
        return [];
    const cfgObj = isPlainObject(config) ? config : {};
    const missing = [];
    for (const [key, exampleVal] of Object.entries(example)) {
        const keyPath = prefix ? `${prefix}.${key}` : key;
        if (!Object.prototype.hasOwnProperty.call(cfgObj, key)) {
            missing.push(keyPath);
            continue;
        }
        if (isPlainObject(exampleVal)) {
            missing.push(...diffKeyPaths(cfgObj[key], exampleVal, keyPath));
        }
    }
    return missing;
}
function mergeMissingDefaults(config, example) {
    const addedKeys = [];
    function walk(cfg, ex, prefix) {
        if (!isPlainObject(ex))
            return cfg === undefined ? ex : cfg;
        const cfgObj = isPlainObject(cfg) ? { ...cfg } : {};
        for (const [key, exVal] of Object.entries(ex)) {
            const keyPath = prefix ? `${prefix}.${key}` : key;
            if (!Object.prototype.hasOwnProperty.call(cfgObj, key)) {
                cfgObj[key] = exVal;
                addedKeys.push(keyPath);
            }
            else if (isPlainObject(exVal)) {
                cfgObj[key] = walk(cfgObj[key], exVal, keyPath);
            }
        }
        return cfgObj;
    }
    return { merged: walk(config, example, ''), addedKeys };
}
function syncConfig(opts = {}) {
    const projectRoot = opts.projectRoot ?? getProjectRoot();
    const configPath = opts.configPath ?? resolveConfigPath(projectRoot);
    const examplePath = opts.examplePath ?? resolveExamplePath(projectRoot);
    if (!fs_1.default.existsSync(examplePath)) {
        throw new Error(`config.example.json not found at ${examplePath} - image may be corrupt.`);
    }
    const example = readJson(examplePath);
    // No config.json (or an empty stub) yet -> seed it from the example.
    if (!fs_1.default.existsSync(configPath) || fs_1.default.statSync(configPath).size < 10) {
        writeConfigAtomic(configPath, example);
        return { configPath, examplePath, created: true, addedKeys: [], patched: true };
    }
    const config = readJson(configPath);
    const addedKeys = diffKeyPaths(config, example);
    if (addedKeys.length === 0) {
        return { configPath, examplePath, created: false, addedKeys: [], patched: false };
    }
    if (!opts.patch) {
        return { configPath, examplePath, created: false, addedKeys, patched: false };
    }
    const { merged } = mergeMissingDefaults(config, example);
    const { backupPath } = writeConfigAtomic(configPath, merged);
    return { configPath, examplePath, created: false, addedKeys, patched: true, backupPath };
}
if (require.main === module) {
    const args = process.argv.slice(2);
    const patch = args.includes('--patch');
    const getArg = (flag) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : undefined;
    };
    try {
        const report = syncConfig({
            configPath: getArg('--config'),
            examplePath: getArg('--example'),
            patch
        });
        if (report.created) {
            console.log(`[config-sync] No config.json found - generated from ${path_1.default.basename(report.examplePath)}.`);
        }
        else if (report.addedKeys.length === 0) {
            console.log('[config-sync] config.json is up to date.');
        }
        else if (report.patched) {
            console.log(`[config-sync] Added ${report.addedKeys.length} missing key(s) to config.json:`);
            report.addedKeys.forEach(k => console.log(`[config-sync]   + ${k}`));
            if (report.backupPath)
                console.log(`[config-sync] Backup saved to ${report.backupPath}`);
        }
        else {
            console.warn('');
            console.warn('┌──────────────────────────────────────────────────────────┐');
            console.warn('│  ⚠  CONFIG UPDATE AVAILABLE                              │');
            console.warn('│  Missing keys (see config.example.json for defaults):    │');
            report.addedKeys.forEach(k => console.warn(('│    + ' + k).padEnd(60) + '│'));
            console.warn('│  Set CONFIG_AUTO_SYNC=true to patch automatically, or    │');
            console.warn('│  delete config.json to regenerate it from scratch.       │');
            console.warn('└──────────────────────────────────────────────────────────┘');
            console.warn('');
        }
        process.exit(0);
    }
    catch (err) {
        console.error(`[config-sync] ERROR: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
}
//# sourceMappingURL=ConfigSync.js.map