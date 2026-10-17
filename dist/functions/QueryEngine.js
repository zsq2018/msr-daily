"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryCore = void 0;
exports.normalizeQueryKey = normalizeQueryKey;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const fast_xml_parser_1 = require("fast-xml-parser");
const urls_1 = require("../constants/urls");
const rssFeeds_1 = require("../constants/rssFeeds");
const GOOGLE_TRENDS_RPC_ID = 'i0OFE';
const MAX_CLUSTER_SUGGESTIONS = 8;
const MAX_RSS_XML_BYTES = 2 * 1024 * 1024;
const XML_DECLARATION_RE = /<!\s*(?:DOCTYPE|ENTITY)\b/i;
function toArray(value) {
    if (!value)
        return [];
    return Array.isArray(value) ? value : [value];
}
function readTitle(title) {
    if (typeof title === 'string')
        return title;
    if (typeof title === 'number')
        return String(title);
    if (title && typeof title === 'object' && '#text' in title) {
        const text = title['#text'];
        return typeof text === 'string' ? text : typeof text === 'number' ? String(text) : '';
    }
    return '';
}
function stripHtml(text) {
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}
function normalizeQueryKey(query) {
    return query.trim().replace(/\s+/g, ' ').toLowerCase();
}
class QueryCore {
    bot;
    constructor(bot) {
        this.bot = bot;
    }
    async queryManager(options = {}) {
        const { shuffle = false, sourceOrder = ['google', 'wikipedia', 'wikirandom', 'hackernews', 'reddit', 'local'], langCode = 'en', geoLocale = 'US' } = options;
        try {
            this.bot.logger.debug(this.bot.isMobile, 'QUERY-MANAGER', `Building main topic pool | sources=${sourceOrder.join(',')} | shuffle=${shuffle} | lang=${langCode} | geo=${geoLocale}`);
            const sourceHandlers = {
                google: () => this.getGoogleTrends(geoLocale.toUpperCase()).catch(() => []),
                wikipedia: () => this.getWikipediaTrending(langCode).catch(() => []),
                wikirandom: () => this.getWikipediaRandom(langCode).catch(() => []),
                hackernews: () => this.getHackerNewsTopics().catch(() => []),
                reddit: () => this.getRedditTopics().catch(() => []),
                local: () => this.getLocalQueryList()
            };
            const isRss = (source) => source === 'rss' || source.startsWith('rss.');
            const coreSources = sourceOrder.filter(source => !isRss(source));
            const rssSelectors = sourceOrder.filter(isRss);
            const topicLists = await Promise.all([
                ...coreSources.map(async (source) => {
                    const handler = sourceHandlers[source];
                    if (!handler)
                        return [];
                    const topics = await Promise.resolve(handler());
                    this.bot.logger.debug(this.bot.isMobile, 'QUERY-MANAGER', `Source "${source}" returned ${topics.length}`);
                    return topics;
                }),
                ...(rssSelectors.length
                    ? [
                        this.getRssTopics(rssSelectors)
                            .catch(() => [])
                            .then(topics => {
                            this.bot.logger.debug(this.bot.isMobile, 'QUERY-MANAGER', `Source "rss" returned ${topics.length} (${rssSelectors.length} selector(s))`);
                            return topics;
                        })
                    ]
                    : [])
            ]);
            const rawTopics = topicLists.flat();
            const topics = this.normalizeAndDedupe(rawTopics);
            if (!topics.length) {
                this.bot.logger.warn(this.bot.isMobile, 'QUERY-MANAGER', 'No topics returned by any source');
                return [];
            }
            if (shuffle) {
                this.bot.utils.shuffleArray(topics);
                this.bot.logger.debug(this.bot.isMobile, 'QUERY-MANAGER', `Shuffled main topic pool | first="${topics[0] ?? ''}"`);
            }
            this.bot.logger.debug(this.bot.isMobile, 'QUERY-MANAGER', `Built main topic pool | raw=${rawTopics.length} | unique=${topics.length} | duplicatesRemoved=${rawTopics.length - topics.length}`);
            return topics;
        }
        catch (error) {
            this.bot.logger.error(this.bot.isMobile, 'QUERY-MANAGER', `Failed building main topic pool | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    async getConfiguredSearchTopics(forceRefresh = false) {
        const langCode = (this.bot.userData.langCode ?? 'en').toLowerCase();
        const geoLocale = (this.bot.userData.geoLocale ?? 'US').toUpperCase();
        const sourceOrder = this.bot.config.searchSettings.queryEngines;
        const cacheKey = JSON.stringify([langCode, geoLocale, sourceOrder]);
        let cache = this.bot.searchTopicsCache;
        if (forceRefresh || cache?.key !== cacheKey) {
            cache = {
                key: cacheKey,
                topics: this.queryManager({ shuffle: false, langCode, geoLocale, sourceOrder })
            };
            this.bot.searchTopicsCache = cache;
        }
        const topics = [...(await cache.topics)];
        if (!topics.length && this.bot.searchTopicsCache === cache)
            this.bot.searchTopicsCache = null;
        this.bot.utils.shuffleArray(topics);
        return topics;
    }
    async getSearchCluster(mainTopic) {
        const normalizedMain = this.normalizeAndDedupe([mainTopic])[0];
        if (!normalizedMain)
            return [];
        if (!this.bot.config.searchSettings.clusterSearch) {
            this.bot.logger.debug(this.bot.isMobile, 'QUERY-CLUSTER', `Clustering disabled | main="${normalizedMain}"`);
            return [normalizedMain];
        }
        const langCode = (this.bot.userData.langCode ?? 'en').toLowerCase();
        this.bot.logger.debug(this.bot.isMobile, 'QUERY-CLUSTER', `Fetching related queries | main="${normalizedMain}" | lang=${langCode} | limit=${MAX_CLUSTER_SUGGESTIONS}`);
        const [suggestionsResult, relatedResult] = await Promise.allSettled([
            this.getBingSuggestions(normalizedMain, langCode),
            this.getBingRelatedTerms(normalizedMain)
        ]);
        const rawSuggestions = suggestionsResult.status === 'fulfilled' ? suggestionsResult.value : [];
        const rawRelated = relatedResult.status === 'fulfilled' ? relatedResult.value : [];
        if (suggestionsResult.status === 'rejected') {
            this.bot.logger.debug(this.bot.isMobile, 'QUERY-CLUSTER', `Related source unavailable | source=v7 | main="${normalizedMain}" | ${String(suggestionsResult.reason)}`);
        }
        if (relatedResult.status === 'rejected') {
            this.bot.logger.debug(this.bot.isMobile, 'QUERY-CLUSTER', `Related source unavailable | source=osjson | main="${normalizedMain}" | ${String(relatedResult.reason)}`);
        }
        const suggestions = this.normalizeAndDedupe(rawSuggestions);
        const related = this.normalizeAndDedupe(rawRelated);
        this.bot.logger.debug(this.bot.isMobile, 'QUERY-CLUSTER', `Related source ready | source=v7 | main="${normalizedMain}" | raw=${rawSuggestions.length} | unique=${suggestions.length} | queries=${JSON.stringify(suggestions)}`);
        this.bot.logger.debug(this.bot.isMobile, 'QUERY-CLUSTER', `Related source ready | source=osjson | main="${normalizedMain}" | raw=${rawRelated.length} | unique=${related.length} | queries=${JSON.stringify(related)}`);
        const interleaved = [];
        const sourceLength = Math.max(suggestions.length, related.length);
        for (let index = 0; index < sourceLength; index++) {
            const suggestion = suggestions[index];
            const relatedTerm = related[index];
            if (suggestion)
                interleaved.push(suggestion);
            if (relatedTerm)
                interleaved.push(relatedTerm);
        }
        const mainKey = normalizeQueryKey(normalizedMain);
        const merged = this.normalizeAndDedupe(interleaved).filter(query => normalizeQueryKey(query) !== mainKey);
        const selected = merged.slice(0, MAX_CLUSTER_SUGGESTIONS);
        this.bot.logger.debug(this.bot.isMobile, 'QUERY-CLUSTER', `Related queries merged | main="${normalizedMain}" | availableSources=${Number(suggestions.length > 0) + Number(related.length > 0)} | unique=${merged.length} | selected=${selected.length} | queries=${JSON.stringify(selected)}`);
        const cluster = [normalizedMain, ...selected];
        this.bot.utils.shuffleArray(cluster);
        this.bot.logger.debug(this.bot.isMobile, 'QUERY-CLUSTER', `Cluster ready | main="${normalizedMain}" | related=${Math.max(0, cluster.length - 1)} | total=${cluster.length} | order=${JSON.stringify(cluster)}`);
        return cluster;
    }
    normalizeAndDedupe(queries) {
        const seen = new Set();
        const out = [];
        for (const query of queries) {
            const trimmed = query?.trim();
            if (!trimmed)
                continue;
            const key = normalizeQueryKey(trimmed);
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push(trimmed.replace(/\s+/g, ' '));
        }
        return out;
    }
    async getGoogleTrends(geoLocale) {
        const queryTerms = [];
        try {
            const request = {
                url: urls_1.URLs.queryEngine.googleTrends,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                data: `f.req=[[[${GOOGLE_TRENDS_RPC_ID},"[null, null, \\"${geoLocale.toUpperCase()}\\", 0, null, 48]"]]]`
            };
            const response = await this.bot.http.request(request, this.bot.config.proxy.queryEngine);
            const trendsData = this.extractJsonFromResponse(response.data);
            if (!trendsData) {
                this.bot.logger.debug(this.bot.isMobile, 'SEARCH-GOOGLE-TRENDS', 'No trends data parsed from response');
                return [];
            }
            const mapped = trendsData.map(q => [q[0], q[9].slice(1)]);
            if (mapped.length < 90 && geoLocale !== 'US') {
                return this.getGoogleTrends('US');
            }
            for (const [topic, related] of mapped) {
                queryTerms.push({ topic: topic, related: related });
            }
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-GOOGLE-TRENDS', `Request failed | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
        return queryTerms.flatMap(x => [x.topic, ...x.related]);
    }
    extractJsonFromResponse(text) {
        for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('['))
                continue;
            try {
                return JSON.parse(JSON.parse(trimmed)[0][2])[1];
            }
            catch { }
        }
        return null;
    }
    async getBingSuggestions(query = '', langCode = 'en') {
        try {
            const request = {
                url: urls_1.URLs.queryEngine.bingSuggestions(query, langCode),
                method: 'GET',
                headers: { ...(this.bot.fingerprint?.headers ?? {}) }
            };
            const response = await this.bot.http.request(request, this.bot.config.proxy.queryEngine);
            return response.data.suggestionGroups?.[0]?.searchSuggestions?.map((x) => x.query) ?? [];
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-BING-SUGGESTIONS', `Request failed | query="${query}" | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    async getBingRelatedTerms(query) {
        try {
            const request = {
                url: urls_1.URLs.queryEngine.bingRelated(query),
                method: 'GET',
                headers: { ...(this.bot.fingerprint?.headers ?? {}) }
            };
            const response = await this.bot.http.request(request, this.bot.config.proxy.queryEngine);
            const related = response.data?.[1];
            return Array.isArray(related)
                ? related.filter((term) => typeof term === 'string' && term.trim().length > 0)
                : [];
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-BING-RELATED', `Request failed | query="${query}" | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    async getWikipediaTrending(langCode = 'en') {
        try {
            const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            const request = {
                url: urls_1.URLs.queryEngine.wikipediaTop(langCode, year, month, day),
                method: 'GET',
                headers: { ...(this.bot.fingerprint?.headers ?? {}) }
            };
            const response = await this.bot.http.request(request, this.bot.config.proxy.queryEngine);
            const articles = response.data.items?.[0]?.articles ?? [];
            return articles.slice(0, 50).map(a => a.article.replace(/_/g, ' '));
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-WIKIPEDIA-TRENDING', `Request failed | lang=${langCode} | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    async getRedditTopics(subreddit = 'popular') {
        const safe = subreddit.replace(/[^a-zA-Z0-9_+]/g, '');
        try {
            const request = {
                url: urls_1.URLs.queryEngine.reddit(safe),
                method: 'GET',
                headers: { ...(this.bot.fingerprint?.headers ?? {}) }
            };
            const response = await this.bot.http.request(request, this.bot.config.proxy.queryEngine);
            const posts = response.data.data?.children ?? [];
            return posts.filter(p => !p.data.over_18).map(p => p.data.title);
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-REDDIT', `Request failed | subreddit=${safe} | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    async getHackerNewsTopics() {
        try {
            const request = {
                url: urls_1.URLs.queryEngine.hackerNews,
                method: 'GET',
                headers: { ...(this.bot.fingerprint?.headers ?? {}) }
            };
            const response = await this.bot.http.request(request, this.bot.config.proxy.queryEngine);
            const hits = response.data?.hits ?? [];
            return hits.map(h => (h.title ?? '').replace(/^(?:Show|Ask)\s+HN:\s*/i, '').trim()).filter(Boolean);
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-HACKERNEWS', `Request failed | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    async getWikipediaRandom(langCode = 'en') {
        const lang = (langCode || 'en').split('-')[0] || 'en';
        try {
            const request = {
                url: urls_1.URLs.queryEngine.wikipediaRandom(lang),
                method: 'GET',
                headers: { ...(this.bot.fingerprint?.headers ?? {}) }
            };
            const response = await this.bot.http.request(request, this.bot.config.proxy.queryEngine);
            const pages = response.data?.query?.random ?? [];
            return pages.map(p => p.title.trim()).filter(Boolean);
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-WIKIPEDIA-RANDOM', `Request failed | lang=${lang} | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    async getRssTopics(selectors) {
        const urls = this.resolveRssUrls(selectors);
        if (!urls.length)
            return [];
        const lists = await Promise.all(urls.map(url => this.fetchRssTitles(url).catch(() => [])));
        return lists.flat();
    }
    resolveRssUrls(selectors) {
        const urls = new Set();
        for (const selector of selectors) {
            const [, site, endpoint] = selector.split('.');
            if (!site) {
                for (const feeds of Object.values(rssFeeds_1.RSS_FEEDS)) {
                    for (const url of Object.values(feeds))
                        urls.add(url);
                }
                continue;
            }
            const feeds = rssFeeds_1.RSS_FEEDS[site];
            if (!feeds) {
                this.bot.logger.warn(this.bot.isMobile, 'SEARCH-RSS', `Unknown RSS site "${site}" in "${selector}"`);
                continue;
            }
            if (!endpoint) {
                for (const url of Object.values(feeds))
                    urls.add(url);
                continue;
            }
            const url = feeds[endpoint];
            if (url)
                urls.add(url);
            else
                this.bot.logger.warn(this.bot.isMobile, 'SEARCH-RSS', `Unknown RSS feed "${site}.${endpoint}"`);
        }
        return [...urls];
    }
    async fetchRssTitles(url) {
        try {
            const request = {
                url,
                method: 'GET',
                headers: { ...(this.bot.fingerprint?.headers ?? {}) }
            };
            const response = await this.bot.http.request(request, this.bot.config.proxy.queryEngine);
            const xml = typeof response.data === 'string' ? response.data : String(response.data ?? '');
            return this.parseRssTitles(xml);
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-RSS', `Feed failed | ${url} | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    parseRssTitles(xml) {
        if (!xml)
            return [];
        if (Buffer.byteLength(xml, 'utf8') > MAX_RSS_XML_BYTES || XML_DECLARATION_RE.test(xml))
            return [];
        let doc;
        try {
            doc = new fast_xml_parser_1.XMLParser({ ignoreAttributes: true, htmlEntities: true, parseTagValue: false }).parse(xml);
        }
        catch {
            return [];
        }
        const entries = [
            ...toArray(doc?.rss?.channel?.item),
            ...toArray(doc?.['rdf:RDF']?.item),
            ...toArray(doc?.feed?.entry)
        ];
        return entries.map(entry => stripHtml(readTitle(entry?.title)).trim()).filter(Boolean);
    }
    getLocalQueryList() {
        try {
            const file = path_1.default.join(__dirname, './search-queries.json');
            const queries = JSON.parse(fs.readFileSync(file, 'utf8'));
            return Array.isArray(queries) ? queries : [];
        }
        catch (error) {
            this.bot.logger.debug(this.bot.isMobile, 'SEARCH-LOCAL-QUERY-LIST', `Failed reading search-queries.json | ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
}
exports.QueryCore = QueryCore;
//# sourceMappingURL=QueryEngine.js.map