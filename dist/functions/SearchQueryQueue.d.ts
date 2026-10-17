import type { MicrosoftRewardsBot } from '../index';
import { QueryCore } from './QueryEngine';
export declare class SearchQueryQueue {
    private readonly bot;
    private readonly queryCore;
    private topics;
    private topicIndex;
    private activeCluster;
    private activeMainTopic;
    private activeClusterSize;
    private activeClusterIndex;
    private readonly seenTopics;
    private readonly seenQueries;
    private refillCount;
    constructor(bot: MicrosoftRewardsBot, queryCore?: QueryCore);
    prepare(): Promise<number>;
    next(): Promise<string | null>;
    private nextMainTopic;
    private refillTopics;
}
//# sourceMappingURL=SearchQueryQueue.d.ts.map