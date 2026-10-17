export type OverrideType = 'string' | 'bool' | 'number' | 'array';
export interface EnvOverrideEntry {
    env: string;
    path: string;
    type: OverrideType;
}
export declare const ENV_OVERRIDES: EnvOverrideEntry[];
export interface ComputedOverride {
    env: string;
    path: string;
    value: unknown;
}
export interface OverrideError {
    env: string;
    message: string;
}
export declare function computeOverrides(env?: NodeJS.ProcessEnv): {
    applied: ComputedOverride[];
    errors: OverrideError[];
};
export interface ApplyReport {
    configPath: string;
    forced: {
        path: string;
        value: unknown;
    }[];
    applied: ComputedOverride[];
    errors: OverrideError[];
}
export declare function applyEnvOverrides(configPath: string, env?: NodeJS.ProcessEnv): ApplyReport;
//# sourceMappingURL=ConfigEnvOverrides.d.ts.map