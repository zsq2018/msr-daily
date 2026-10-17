"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flushQueue = flushQueue;
async function flushQueue(queue, timeoutMs = 5000) {
    let timer;
    await Promise.race([
        queue.onIdle(),
        new Promise(resolve => {
            timer = setTimeout(resolve, timeoutMs);
        })
    ]);
    if (timer)
        clearTimeout(timer);
}
//# sourceMappingURL=Queue.js.map