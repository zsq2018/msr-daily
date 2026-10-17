export interface SyncReport {
    configPath: string;
    examplePath: string;
    created: boolean;
    addedKeys: string[];
    patched: boolean;
    backupPath?: string;
}
export declare function getProjectRoot(startDir?: string): string;
export declare function resolveConfigPath(projectRoot?: string): string;
export declare function resolveExamplePath(projectRoot?: string): string;
export declare function readJson(filePath: string): unknown;
export declare function writeConfigAtomic(targetPath: string, cfg: unknown, opts?: {
    backup?: boolean;
}): {
    backupPath?: string;
};
export declare function diffKeyPaths(config: unknown, example: unknown, prefix?: string): string[];
export declare function mergeMissingDefaults<T = unknown>(config: unknown, example: T): {
    merged: T;
    addedKeys: string[];
};
export interface SyncOptions {
    projectRoot?: string;
    configPath?: string;
    examplePath?: string;
    /** If true, missing keys are written into config.json (with a .bak backup). If false, only reported. */
    patch?: boolean;
}
export declare function syncConfig(opts?: SyncOptions): SyncReport;
//# sourceMappingURL=ConfigSync.d.ts.map