"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PunchCards = void 0;
const urls_1 = require("../../../constants/urls");
const BaseActivity_1 = require("../BaseActivity");
class PunchCards extends BaseActivity_1.BaseActivity {
    async runMobile(data) {
        try {
            await this.run(data);
        }
        catch (error) {
            this.bot.logger.error('main', 'PUNCHCARD', `Mobile punchcards failed | ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async runDesktop() {
        if (!this.bot.config.workers.doPunchCards)
            return;
        let data;
        try {
            data = await this.bot.browser.func.getDashboardData(this.bot.cookies.desktop);
        }
        catch (error) {
            this.bot.logger.warn('main', 'PUNCHCARD', `Desktop punchcard data unavailable | ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
        try {
            await this.run(data);
        }
        catch (error) {
            this.bot.logger.error('main', 'PUNCHCARD', `Desktop punchcards failed | ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async run(data) {
        const parents = await this.getParentQuests();
        if (!parents)
            return;
        const apiById = new Map((data.dashboard.punchCards ?? [])
            .filter(card => card.parentPromotion?.offerId)
            .map(card => [card.parentPromotion.offerId, card]));
        this.mergeApiParents(parents, apiById);
        const pending = parents.filter(parent => {
            if (parent.complete)
                return false;
            return !this.bot.config.skipNonPointTasks || parent.pointProgressMax > 0;
        });
        if (!pending.length) {
            this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', 'No actionable quests');
            return;
        }
        this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', `Found ${pending.length} incomplete quest(s) | apiMatched=${pending.filter(parent => apiById.has(parent.offerId)).length}`);
        for (const parent of pending) {
            try {
                await this.solvePunchCard(parent, apiById.get(parent.offerId));
            }
            catch (error) {
                this.bot.logger.error(this.bot.isMobile, 'PUNCHCARD', `Error solving quest "${parent.title || parent.offerId}" | message=${error instanceof Error ? error.message : String(error)}`);
            }
        }
        this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', 'Finished processing quests');
    }
    async getParentQuests() {
        try {
            const earn = await this.bot.browser.func.getRewardsPageHtml(urls_1.URLs.rewards.earn, '/earn');
            if (!earn) {
                this.bot.logger.warn(this.bot.isMobile, 'PUNCHCARD', '/earn unavailable - cannot list quests');
                return null;
            }
            const parents = this.bot.browser.react.snapshotQuestList(earn);
            if (parents.length)
                return parents;
            const dashboard = await this.bot.browser.func.getRewardsPageHtml(urls_1.URLs.rewards.dashboard, '/dashboard');
            return dashboard ? this.bot.browser.react.snapshotQuestList(earn, dashboard) : parents;
        }
        catch (error) {
            this.bot.logger.warn(this.bot.isMobile, 'PUNCHCARD', `Failed fetching quest list | ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    mergeApiParents(parents, apiById) {
        const seen = new Set(parents.map(parent => parent.offerId));
        for (const card of apiById.values()) {
            const promotion = card.parentPromotion;
            if (!promotion?.offerId || seen.has(promotion.offerId))
                continue;
            parents.push({
                offerId: promotion.offerId,
                title: promotion.title ?? '',
                pointProgressMax: promotion.pointProgressMax ?? 0,
                complete: Boolean(promotion.complete)
            });
            seen.add(promotion.offerId);
        }
        for (const parent of parents) {
            if (parent.pointProgressMax > 0)
                continue;
            parent.pointProgressMax = apiById.get(parent.offerId)?.parentPromotion?.pointProgressMax ?? 0;
        }
    }
    async solvePunchCard(parent, apiCard) {
        const parentId = parent.offerId;
        const title = parent.title || apiCard?.parentPromotion?.title || parentId;
        const children = await this.getQuestChildren(parentId, title);
        if (!children)
            return;
        const apiChildById = new Map((apiCard?.childPromotions ?? [])
            .filter(child => child.offerId)
            .map(child => [child.offerId, child]));
        const ordered = [...children].sort((left, right) => (apiChildById.get(left.offerId)?.priority ?? Number.MAX_SAFE_INTEGER) -
            (apiChildById.get(right.offerId)?.priority ?? Number.MAX_SAFE_INTEGER));
        this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', `Solving "${title}" | children=${ordered.length} | reportable=${ordered.filter(child => child.reportable).length}`);
        const startBalance = this.bot.userData.currentPoints;
        let reported = 0;
        let remaining = 0;
        for (const child of ordered) {
            const apiChild = apiChildById.get(child.offerId);
            if (!child.reportable) {
                remaining += 1;
                this.bot.logger.debug(this.bot.isMobile, 'PUNCHCARD', `Skip ${child.offerId}: not reportable (locked=${child.isLocked} disabled=${child.isDisabled} done=${child.isCompleted} hash=${Boolean(child.hash)})`);
                continue;
            }
            if (this.isSearchQuotaChild(child.offerId, apiChild)) {
                remaining += 1;
                this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', `Skip ${child.offerId}: multi-day search task`);
                continue;
            }
            if (this.isClaimChild(child.offerId, apiChild)) {
                if (!this.bot.config.autoClaimPunchcardRewards) {
                    remaining += 1;
                    this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', `Reward for "${title}" is ready for manual redemption | offerId=${child.offerId}`);
                    continue;
                }
                await this.bot.activities.doClaimReward(child, parentId);
            }
            else {
                await this.reportQuestChild(child, parentId);
            }
            reported += 1;
            await this.bot.utils.wait(this.bot.utils.randomDelay(5000, 15000));
        }
        const gained = this.bot.userData.currentPoints - startBalance;
        this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', `Quest "${title}" ${remaining === 0 ? 'COMPLETE' : 'in progress'} | reported=${reported}` +
            `${remaining ? ` | remaining=${remaining}` : ''} | pointsGained=${gained}` +
            ` | currentBalance=${this.bot.userData.currentPoints}` +
            `${parent.pointProgressMax > 0 ? ` | targetPoints=${parent.pointProgressMax}` : ''}`, gained > 0 ? 'green' : undefined);
    }
    async getQuestChildren(parentId, title) {
        try {
            const questUrl = urls_1.URLs.rewards.quest(parentId);
            const html = await this.bot.browser.func.getRewardsPageHtml(questUrl, `/earn/quest/${parentId}`);
            if (!html) {
                this.bot.logger.warn(this.bot.isMobile, 'PUNCHCARD', `Quest page unavailable for "${title}"`);
                return null;
            }
            const children = this.bot.browser.react.snapshotQuestPage(html);
            if (!children.length) {
                this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', `No actionable children for "${title}"`);
                return null;
            }
            return children;
        }
        catch (error) {
            this.bot.logger.warn(this.bot.isMobile, 'PUNCHCARD', `Failed fetching quest page for "${title}" | ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    async reportQuestChild(child, parentId) {
        const actionId = this.bot.nextActions.reportActivity;
        if (!actionId) {
            this.bot.logger.warn(this.bot.isMobile, 'PUNCHCARD', `Skip ${child.offerId}: "reportActivity" was not discovered`);
            return;
        }
        if (!child.hash) {
            this.bot.logger.warn(this.bot.isMobile, 'PUNCHCARD', `Skip ${child.offerId}: no live hash`);
            return;
        }
        const oldBalance = this.bot.userData.currentPoints;
        try {
            const questUrl = urls_1.URLs.rewards.quest(parentId);
            const { status, acknowledged } = await this.bot.browser.func.reportServerAction(actionId, [
                child.hash,
                11,
                {
                    offerid: child.offerId,
                    isPromotional: '$undefined',
                    timezoneOffset: this.bot.userData.timezoneOffset
                }
            ], {
                url: questUrl,
                referer: questUrl,
                routerStateTree: this.bot.browser.react.questRouterStateTree(parentId)
            });
            const newBalance = await this.bot.browser.func.getCurrentPoints();
            const gained = newBalance - oldBalance;
            if (gained > 0) {
                this.bot.userData.currentPoints = newBalance;
                this.bot.userData.gainedPoints = (this.bot.userData.gainedPoints ?? 0) + gained;
            }
            this.bot.logger.info(this.bot.isMobile, 'PUNCHCARD', `Reported child | offerId=${child.offerId} | status=${status} | acknowledged=${acknowledged}` +
                ` | pointsGained=${gained} | currentBalance=${newBalance}`, gained > 0 || acknowledged ? 'green' : undefined);
        }
        catch (error) {
            this.bot.logger.error(this.bot.isMobile, 'PUNCHCARD', `Error reporting child | offerId=${child.offerId} | message=${error instanceof Error ? error.message : String(error)}`);
        }
    }
    isSearchQuotaChild(offerId, promotion) {
        if (promotion) {
            const type = (promotion.promotionType ?? '').toLowerCase();
            const attributeType = String(this.getAttribute(promotion, 'type') ?? '').toLowerCase();
            const progressMax = Number(promotion.activityProgressMax ?? 0);
            if (type === 'search' || attributeType === 'search' || progressMax > 1)
                return true;
        }
        return /search/i.test(offerId) && /(day|streak|\dx)/i.test(offerId);
    }
    isClaimChild(offerId, promotion) {
        if (/\/redeem\//.test((promotion?.destinationUrl ?? '').toLowerCase()))
            return true;
        return /(redeem|claim|(?<!url)reward)/i.test(offerId);
    }
    getAttribute(promotion, key) {
        const attributes = promotion.attributes;
        if (!attributes || typeof attributes !== 'object')
            return undefined;
        return attributes[key];
    }
}
exports.PunchCards = PunchCards;
//# sourceMappingURL=PunchCards.js.map