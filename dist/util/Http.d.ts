import type { AccountProxy } from '../interface/Account';
export interface HttpRequestConfig {
    url?: string;
    method?: string;
    headers?: Record<string, unknown>;
    params?: Record<string, string> | URLSearchParams;
    data?: unknown;
    timeout?: number;
    responseType?: 'json' | 'text';
}
export interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string | string[]>;
    config: HttpRequestConfig;
}
export declare function mergeRequestHeaders(defaultHeaders: Record<string, unknown>, requestHeaders?: Record<string, unknown>): Record<string, unknown>;
declare class HttpClient {
    private instance;
    private direct?;
    private account;
    private defaultHeaders;
    constructor(account: AccountProxy, defaultHeaders?: Record<string, unknown>);
    setDefaultHeaders(headers: Record<string, unknown>): void;
    request<T = unknown>(config: HttpRequestConfig, useProxy?: boolean): Promise<HttpResponse<T>>;
    private buildProxyUrl;
}
export declare function httpRequest<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
export default HttpClient;
//# sourceMappingURL=Http.d.ts.map