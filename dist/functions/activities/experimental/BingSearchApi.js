"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BingSearchApi = void 0;
const crypto_1 = require("crypto");
const urls_1 = require("../../../constants/urls");
class BingSearchApi {
    bot;
    cookieJar = new Map();
    constructor(bot) {
        this.bot = bot;
        const cookies = bot.isMobile ? bot.cookies.mobile : bot.cookies.desktop;
        for (const cookie of cookies) {
            const domain = cookie.domain.replace(/^\./, '');
            if (domain === 'bing.com' || domain.endsWith('.bing.com')) {
                this.cookieJar.set(cookie.name, cookie.value);
            }
        }
    }
    async report(query, options) {
        const cvid = options?.cvid ?? (0, crypto_1.randomBytes)(16).toString('hex');
        const searchUrl = urls_1.URLs.bing.search(query, cvid);
        const headers = { ...(this.bot.fingerprint?.headers ?? {}) };
        delete headers['Cookie'];
        delete headers['cookie'];
        const searchResponse = await this.bot.http.request({
            url: searchUrl,
            method: 'GET',
            headers: {
                ...headers,
                Cookie: this.cookieHeader(),
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        this.mergeCookies(searchResponse.headers?.['set-cookie']);
        const ig = this.readIg(searchResponse.data);
        if (!ig) {
            this.bot.logger.warn(this.bot.isMobile, 'SEARCH-REPORT', `No IG for "${query}" - SERP not served as expected`);
            return { ig: null, ...this.emptyReport(), gained: null };
        }
        const params = new URLSearchParams({
            IG: ig,
            IID: 'SERP.5064',
            q: query,
            FORM: 'ANNTA1',
            cvid,
            ajaxreq: '1'
        });
        if (options?.cg)
            params.set('cg', options.cg);
        const reportResponse = await this.bot.http.request({
            url: `${urls_1.URLs.bing.origin}/rewardsapp/reportActivity?${params.toString()}`,
            method: 'POST',
            headers: {
                ...headers,
                Cookie: this.cookieHeader(),
                Accept: '*/*',
                'Content-Type': 'application/x-www-form-urlencoded',
                Referer: searchUrl,
                Origin: urls_1.URLs.bing.origin,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'X-Requested-With': 'XMLHttpRequest'
            },
            data: `url=${encodeURIComponent(searchUrl)}&V=web`
        });
        this.mergeCookies(reportResponse.headers?.['set-cookie']);
        const parsed = this.parseReport(reportResponse.data);
        const gained = parsed.balance !== null && parsed.previousBalance !== null ? parsed.balance - parsed.previousBalance : null;
        this.bot.logger.debug(this.bot.isMobile, 'SEARCH-REPORT', `Reported "${query}" | ig=${ig} | pointsGained=${gained ?? 'n/a'}` +
            ` | currentBalance=${parsed.balance ?? 'n/a'}` +
            ` | searchPts=${parsed.searchPointsEarned ?? 'n/a'}/${parsed.searchPointsLimit ?? 'n/a'}`);
        return { ig, ...parsed, gained };
    }
    readIg(data) {
        if (typeof data !== 'string')
            return null;
        return (data.match(/\bIG:"([A-F0-9]{32})"/i) ?? data.match(/[?&]IG=([A-F0-9]{32})\b/i))?.[1] ?? null;
    }
    mergeCookies(setCookie) {
        if (!setCookie)
            return;
        for (const raw of Array.isArray(setCookie) ? setCookie : [setCookie]) {
            const pair = raw.split(';', 1)[0] ?? '';
            const separator = pair.indexOf('=');
            if (separator <= 0)
                continue;
            const name = pair.slice(0, separator).trim();
            const value = pair.slice(separator + 1).trim();
            if (!name)
                continue;
            const expired = /expires=Thu,\s*01\s*Jan\s*1970/i.test(raw) || /\bmax-age=0\b/i.test(raw);
            if (!value || expired)
                this.cookieJar.delete(name);
            else
                this.cookieJar.set(name, value);
        }
    }
    cookieHeader() {
        return [...this.cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    }
    parseReport(data) {
        if (typeof data !== 'string')
            return this.emptyReport();
        const match = data.match(/ModernRewards\.ReportActivity\((\{[\s\S]*?\})\)\s*;/);
        if (!match)
            return this.emptyReport();
        try {
            const session = JSON.parse(match[1] ?? '{}').RewardsSessionData ?? {};
            const numberOrNull = (value) => (typeof value === 'number' ? value : null);
            return {
                balance: numberOrNull(session.Balance),
                previousBalance: numberOrNull(session.PreviousBalance),
                searchPointsEarned: numberOrNull(session.DailySearchPointsEarned),
                searchPointsLimit: numberOrNull(session.DailySearchPointsLimit)
            };
        }
        catch {
            return this.emptyReport();
        }
    }
    emptyReport() {
        return {
            balance: null,
            previousBalance: null,
            searchPointsEarned: null,
            searchPointsLimit: null
        };
    }
}
exports.BingSearchApi = BingSearchApi;
//# sourceMappingURL=BingSearchApi.js.map