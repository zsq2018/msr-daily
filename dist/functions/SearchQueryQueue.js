"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQueryQueue = void 0;
const QueryEngine_1 = require("./QueryEngine");
class SearchQueryQueue {
    bot;
    queryCore;
    topics = [];
    topicIndex = 0;
    activeCluster = [];
    activeMainTopic = '';
    activeClusterSize = 0;
    activeClusterIndex = 0;
    seenTopics = new Set();
    seenQueries = new Set();
    refillCount = 0;
    constructor(bot, queryCore = new QueryEngine_1.QueryCore(bot)) {
        this.bot = bot;
        this.queryCore = queryCore;
    }
    async prepare() {
        if (!this.topics.length)
            await this.refillTopics();
        this.bot.logger.debug(this.bot.isMobile, 'QUERY-QUEUE', `Queue prepared | mainTopics=${this.topics.length} | clusterSearch=${this.bot.config.searchSettings.clusterSearch}`);
        return this.topics.length;
    }
    async next() {
        while (!this.activeCluster.length) {
            if (this.activeMainTopic) {
                this.bot.logger.debug(this.bot.isMobile, 'QUERY-QUEUE', `Cluster exhausted | main="${this.activeMainTopic}" | emitted=${this.activeClusterIndex}/${this.activeClusterSize}`);
            }
            const mainTopic = await this.nextMainTopic();
            if (!mainTopic) {
                this.bot.logger.debug(this.bot.isMobile, 'QUERY-QUEUE', `Queue exhausted | topicsSeen=${this.seenTopics.size} | queriesSeen=${this.seenQueries.size}`);
                return null;
            }
            const cluster = await this.queryCore.getSearchCluster(mainTopic);
            let skippedSeen = 0;
            this.activeCluster = cluster.filter(query => {
                const key = (0, QueryEngine_1.normalizeQueryKey)(query);
                if (!key || this.seenQueries.has(key)) {
                    skippedSeen++;
                    return false;
                }
                this.seenQueries.add(key);
                return true;
            });
            this.activeMainTopic = mainTopic;
            this.activeClusterSize = this.activeCluster.length;
            this.activeClusterIndex = 0;
            this.bot.logger.debug(this.bot.isMobile, 'QUERY-QUEUE', `Cluster activated | main="${mainTopic}" | topic=${this.topicIndex}/${this.topics.length} | received=${cluster.length} | queued=${this.activeCluster.length} | skippedSeen=${skippedSeen}`);
        }
        const query = this.activeCluster.shift() ?? null;
        if (!query)
            return null;
        this.activeClusterIndex++;
        this.bot.logger.debug(this.bot.isMobile, 'QUERY-QUEUE', `Dequeued query | main="${this.activeMainTopic}" | query=${this.activeClusterIndex}/${this.activeClusterSize} | remaining=${this.activeCluster.length} | value="${query}"`);
        return query;
    }
    async nextMainTopic() {
        while (this.topicIndex >= this.topics.length) {
            if ((await this.refillTopics()) === 0)
                return null;
        }
        const topic = this.topics[this.topicIndex++];
        if (!topic)
            return null;
        this.seenTopics.add((0, QueryEngine_1.normalizeQueryKey)(topic));
        return topic;
    }
    async refillTopics() {
        const topics = await this.queryCore.getConfiguredSearchTopics(this.refillCount > 0);
        this.refillCount++;
        this.topics = topics.filter(topic => {
            const key = (0, QueryEngine_1.normalizeQueryKey)(topic);
            return key.length > 0 && !this.seenTopics.has(key);
        });
        this.topicIndex = 0;
        this.bot.logger.debug(this.bot.isMobile, 'QUERY-QUEUE', `Topic pool refilled | received=${topics.length} | queued=${this.topics.length} | previouslySeen=${this.seenTopics.size}`);
        return this.topics.length;
    }
}
exports.SearchQueryQueue = SearchQueryQueue;
//# sourceMappingURL=SearchQueryQueue.js.map