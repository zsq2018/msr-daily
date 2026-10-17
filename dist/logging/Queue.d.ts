interface IdleQueue {
    onIdle(): Promise<void>;
}
export declare function flushQueue(queue: IdleQueue, timeoutMs?: number): Promise<void>;
export {};
//# sourceMappingURL=Queue.d.ts.map