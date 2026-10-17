"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DailySet_1 = require("./activities/rewards/DailySet");
const MorePromotions_1 = require("./activities/rewards/MorePromotions");
const PunchCards_1 = require("./activities/rewards/PunchCards");
const DailyCheckIn_1 = require("./activities/app/DailyCheckIn");
const ReadToEarn_1 = require("./activities/app/ReadToEarn");
const AppReward_1 = require("./activities/app/AppReward");
const AppPromotions_1 = require("./activities/app/AppPromotions");
const UrlReward_1 = require("./activities/api/UrlReward");
const ClaimBonusPoints_1 = require("./activities/api/ClaimBonusPoints");
const EnsureStreakProtection_1 = require("./activities/api/EnsureStreakProtection");
const ClaimReward_1 = require("./activities/api/ClaimReward");
const ActivateSearchPerk_1 = require("./activities/api/ActivateSearchPerk");
const VisualSearch_1 = require("./activities/visualSearch/VisualSearch");
const BrowserSearch_1 = require("./activities/search/BrowserSearch");
const BrowserSearchOnBing_1 = require("./activities/search/BrowserSearchOnBing");
const ApiSearch_1 = require("./activities/experimental/ApiSearch");
const ApiSearchOnBing_1 = require("./activities/experimental/ApiSearchOnBing");
const EdgeBrowsing_1 = require("./activities/experimental/EdgeBrowsing");
class Activities {
    bot;
    constructor(bot) {
        this.bot = bot;
    }
    doSearch = async (page, isMobile) => {
        if (this.bot.config.experimental.apiSearch) {
            return await new ApiSearch_1.ApiSearch(this.bot).doSearch(isMobile);
        }
        return await new BrowserSearch_1.Search(this.bot).doSearch(page, isMobile);
    };
    doBonusSearches = async (page) => {
        if (this.bot.config.experimental.apiSearch) {
            return await new ApiSearch_1.ApiSearch(this.bot).doBonusSearches();
        }
        return await new BrowserSearch_1.Search(this.bot).doBonusSearches(page);
    };
    doSearchOnBing = async (promotion, page) => {
        if (this.bot.config.experimental.apiSearchOnBing) {
            await new ApiSearchOnBing_1.ApiSearchOnBing(this.bot).doSearchOnBing(promotion);
            return;
        }
        await new BrowserSearchOnBing_1.SearchOnBing(this.bot).doSearchOnBing(promotion, page);
    };
    doDailySet = async (data) => {
        await new DailySet_1.DailySet(this.bot).run(data);
    };
    doMorePromotions = async (data) => {
        await new MorePromotions_1.MorePromotions(this.bot).run(data);
    };
    doPunchCardsMobile = async (data) => {
        await new PunchCards_1.PunchCards(this.bot).runMobile(data);
    };
    doPunchCardsDesktop = async () => {
        await new PunchCards_1.PunchCards(this.bot).runDesktop();
    };
    doUrlReward = async (promotion) => {
        const urlReward = new UrlReward_1.UrlReward(this.bot);
        await urlReward.doUrlReward(promotion);
    };
    doClaimBonusPoints = async () => {
        const claimBonusPoints = new ClaimBonusPoints_1.ClaimBonusPoints(this.bot);
        await claimBonusPoints.claimBonusPoints();
    };
    doEnsureStreakProtection = async () => {
        const ensureStreakProtection = new EnsureStreakProtection_1.EnsureStreakProtection(this.bot);
        await ensureStreakProtection.ensureStreakProtection();
    };
    doClaimReward = async (child, parentId) => {
        const claimReward = new ClaimReward_1.ClaimReward(this.bot);
        await claimReward.claimReward(child, parentId);
    };
    doActivateSearchPerk = async (data) => {
        const activateSearchPerk = new ActivateSearchPerk_1.ActivateSearchPerk(this.bot);
        await activateSearchPerk.activate(data);
    };
    doVisualSearch = async (data) => {
        const visualSearch = new VisualSearch_1.VisualSearch(this.bot);
        return await visualSearch.doVisualSearch(data);
    };
    doAppReward = async (promotion) => {
        const urlReward = new AppReward_1.AppReward(this.bot);
        await urlReward.doAppReward(promotion);
    };
    doReadToEarn = async () => {
        const readToEarn = new ReadToEarn_1.ReadToEarn(this.bot);
        await readToEarn.doReadToEarn();
    };
    doDailyCheckIn = async () => {
        const dailyCheckIn = new DailyCheckIn_1.DailyCheckIn(this.bot);
        await dailyCheckIn.doDailyCheckIn();
    };
    doAppPromotions = async (data) => {
        await new AppPromotions_1.AppPromotions(this.bot).run(data);
    };
    doEdgeBrowsing = async (data, signal) => {
        const edgeBrowsing = new EdgeBrowsing_1.EdgeBrowsing(this.bot);
        await edgeBrowsing.run(data, signal);
    };
}
exports.default = Activities;
//# sourceMappingURL=Activities.js.map