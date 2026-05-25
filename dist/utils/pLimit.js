"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pLimit;
function pLimit(concurrency) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
        throw new TypeError('concurrency must be a positive integer');
    }
    const queue = [];
    let active = 0;
    const next = () => {
        active--;
        if (queue.length > 0)
            queue.shift()();
    };
    return (fn) => new Promise((resolve, reject) => {
        const run = () => {
            active++;
            fn().then(resolve, reject).finally(next);
        };
        if (active < concurrency)
            run();
        else
            queue.push(run);
    });
}
//# sourceMappingURL=pLimit.js.map