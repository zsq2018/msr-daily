"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeRequestHeaders = mergeRequestHeaders;
exports.httpRequest = httpRequest;
const impit_1 = require("impit");
const Proxy_1 = require("./Proxy");
const DEFAULT_TIMEOUT = 20000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;
function mergeRequestHeaders(defaultHeaders, requestHeaders = {}) {
    const merged = { ...defaultHeaders };
    for (const [key, value] of Object.entries(requestHeaders)) {
        const existingKey = Object.keys(merged).find(name => name.toLowerCase() === key.toLowerCase());
        if (existingKey)
            delete merged[existingKey];
        merged[key] = value;
    }
    return merged;
}
function toInit(config) {
    let url = config.url ?? '';
    if (config.params) {
        const qs = config.params instanceof URLSearchParams
            ? config.params.toString()
            : new URLSearchParams(config.params).toString();
        if (qs)
            url += (url.includes('?') ? '&' : '?') + qs;
    }
    const headers = {};
    if (config.headers) {
        for (const [key, value] of Object.entries(config.headers)) {
            if (value === undefined || value === null)
                continue;
            headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
        }
    }
    let body;
    const data = config.data;
    if (data !== undefined && data !== null) {
        if (typeof data === 'string' ||
            data instanceof URLSearchParams ||
            data instanceof Uint8Array ||
            data instanceof ArrayBuffer) {
            body = data;
        }
        else {
            body = JSON.stringify(data);
            if (!Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) {
                headers['Content-Type'] = 'application/json';
            }
        }
    }
    const init = {
        method: (config.method ?? 'GET').toUpperCase(),
        headers,
        body,
        timeout: config.timeout ?? DEFAULT_TIMEOUT
    };
    return { url, init };
}
async function toResponse(res, config) {
    const text = await res.text();
    let data = text;
    if (config.responseType !== 'text') {
        try {
            data = JSON.parse(text);
        }
        catch {
            data = text;
        }
    }
    const headers = {};
    res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
    });
    const withSetCookie = res.headers;
    const setCookie = typeof withSetCookie.getSetCookie === 'function' ? withSetCookie.getSetCookie() : undefined;
    if (setCookie && setCookie.length)
        headers['set-cookie'] = setCookie;
    return {
        data: data,
        status: res.status,
        statusText: res.statusText,
        headers,
        config
    };
}
function backoff(retry) {
    const ms = RETRY_BASE_DELAY * 2 ** (retry - 1) + Math.floor(Math.random() * 250);
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function send(instance, url, init, config) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        let responseStatus;
        try {
            const res = await instance.fetch(url, init);
            responseStatus = res.status;
            const out = await toResponse(res, config);
            if (out.status >= 200 && out.status < 300)
                return out;
            const error = new Error(`Request failed with status code ${out.status}`);
            error.response = out;
            error.status = out.status;
            throw error;
        }
        catch (error) {
            const status = error?.status ?? responseStatus;
            const permanentClientError = typeof status === 'number' &&
                status >= 400 &&
                status < 500 &&
                status !== 408 &&
                status !== 425 &&
                status !== 429;
            if (permanentClientError || attempt >= MAX_RETRIES)
                throw error;
            await backoff(attempt + 1);
        }
    }
    throw new Error('Request failed after maximum retries');
}
class HttpClient {
    instance;
    direct;
    account;
    defaultHeaders;
    constructor(account, defaultHeaders = {}) {
        this.account = account;
        this.defaultHeaders = { ...defaultHeaders };
        const proxyUrl = this.account.url && this.account.proxyHttp ? this.buildProxyUrl(this.account) : undefined;
        this.instance = new impit_1.Impit({ browser: 'chrome', proxyUrl, timeout: DEFAULT_TIMEOUT });
    }
    setDefaultHeaders(headers) {
        this.defaultHeaders = mergeRequestHeaders(this.defaultHeaders, headers);
    }
    async request(config, useProxy = true) {
        const requestConfig = {
            ...config,
            headers: mergeRequestHeaders(this.defaultHeaders, config.headers)
        };
        const { url, init } = toInit(requestConfig);
        if (!useProxy) {
            if (!this.direct)
                this.direct = new impit_1.Impit({ browser: 'chrome', timeout: DEFAULT_TIMEOUT });
            return send(this.direct, url, init, requestConfig);
        }
        return send(this.instance, url, init, requestConfig);
    }
    buildProxyUrl(proxyConfig) {
        const { url: baseUrl, port, username, password } = proxyConfig;
        const urlObj = (0, Proxy_1.parseBrowserProxyUrl)(baseUrl);
        const protocol = urlObj.protocol.toLowerCase();
        if (username && password) {
            urlObj.username = encodeURIComponent(username);
            urlObj.password = encodeURIComponent(password);
            urlObj.port = port.toString();
            return urlObj.toString();
        }
        return `${protocol}//${urlObj.hostname}:${port}`;
    }
}
let sharedInstance;
async function httpRequest(config) {
    if (!sharedInstance)
        sharedInstance = new impit_1.Impit({ browser: 'chrome', timeout: DEFAULT_TIMEOUT });
    const { url, init } = toInit(config);
    return send(sharedInstance, url, init, config);
}
exports.default = HttpClient;
//# sourceMappingURL=Http.js.map