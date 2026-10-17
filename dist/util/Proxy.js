"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BROWSER_PROXY_PROTOCOLS = void 0;
exports.parseBrowserProxyUrl = parseBrowserProxyUrl;
exports.formatBrowserProxyServer = formatBrowserProxyServer;
exports.BROWSER_PROXY_PROTOCOLS = ['http:', 'https:', 'socks4:', 'socks5:'];
const browserProxyProtocols = new Set(exports.BROWSER_PROXY_PROTOCOLS);
const explicitProtocolPattern = /^[a-z][a-z\d+.-]*:\/\//i;
function parseBrowserProxyUrl(value) {
    const input = value.trim();
    if (!input)
        throw new Error('Proxy URL is empty');
    let url;
    try {
        url = new URL(explicitProtocolPattern.test(input) ? input : `http://${input}`);
    }
    catch {
        throw new Error(`Invalid proxy URL: ${value}`);
    }
    const protocol = url.protocol.toLowerCase();
    if (!browserProxyProtocols.has(protocol)) {
        const supported = exports.BROWSER_PROXY_PROTOCOLS.map(item => item.slice(0, -1)).join(', ');
        throw new Error(`Unsupported browser proxy protocol "${protocol.slice(0, -1)}"; supported: ${supported}`);
    }
    if (!url.hostname)
        throw new Error(`Invalid proxy URL: ${value}`);
    return url;
}
function formatBrowserProxyServer(value, port) {
    const url = parseBrowserProxyUrl(value);
    return `${url.protocol}//${url.hostname}:${port}`;
}
//# sourceMappingURL=Proxy.js.map