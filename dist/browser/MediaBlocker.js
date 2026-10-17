"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureMediaBlocking = configureMediaBlocking;
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media']);
async function configureMediaBlocking(bot, context) {
    if (!bot.config.experimental.blockMedia)
        return;
    await context.route('**/*', async (route) => {
        if (BLOCKED_RESOURCE_TYPES.has(route.request().resourceType())) {
            await route.abort();
            return;
        }
        await route.fallback();
    });
    bot.logger.info(bot.isMobile, 'BROWSER', 'Media loading disabled | blockedResourceTypes=image,media | httpCache=disabled-by-routing');
}
//# sourceMappingURL=MediaBlocker.js.map