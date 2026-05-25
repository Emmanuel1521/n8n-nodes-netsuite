export default function pLimit(concurrency: number) {
	if (!Number.isInteger(concurrency) || concurrency < 1) {
		throw new TypeError('concurrency must be a positive integer');
	}

	const queue: Array<() => void> = [];
	let active = 0;

	const next = () => {
		active--;
		if (queue.length > 0) queue.shift()!();
	};

	return <T>(fn: () => Promise<T>): Promise<T> =>
		new Promise<T>((resolve, reject) => {
			const run = () => {
				active++;
				fn().then(resolve, reject).finally(next);
			};
			if (active < concurrency) run();
			else queue.push(run);
		});
}
