import * as path from "path";
import { isMainThread, workerData, Worker, parentPort } from "worker_threads";

enum Signal {
    END,
    WORK,
    COUNT,
    TERMINATE,
}

interface Message {
    signal: Signal;
    data?: any;
}

interface EndMessage extends Message {
    signal: Signal.END;
    data: undefined;
}

interface WorkMessage extends Message {
    signal: Signal.WORK;
    data: undefined;
}

interface CountMessage extends Message {
    signal: Signal.COUNT;
    data: {
        index: number;
    };
}

interface TerminateMessage extends Message {
    signal: Signal.TERMINATE;
    data: undefined;
}

type Messages = EndMessage | WorkMessage | CountMessage | TerminateMessage;

/**
 * Run a piece of code at an accurate interval in a Worker Thread, compensating for the time taken by the code itself.
 * @param condition Condition for the loop to continue.
 * @param interval Interval in nanoseconds.
 * @param work The piece of code to run. The loop will stop if this returns false or a Promise that resolves to false.
 */
export async function createAccurateIntervalWorker(
    condition: (index: number) => boolean,
    interval: bigint,
    work: () => Promise<boolean | void> | boolean | void
) {
    return new Promise<boolean>((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, "streamWorker.js"), {
            workerData: { interval },
        });
        let index = 1;
        worker.on("message", async (msg: Messages) => {
            switch (msg.signal) {
                case Signal.END:
                    resolve(true);
                    break;
                case Signal.COUNT:
                    index = msg.data.index;
                    break;
                case Signal.WORK:
                    if (condition(index)) {
                        const result = await work();
                        if (result !== false) break;
                    }
                    worker.postMessage({ signal: Signal.TERMINATE });
                    worker.terminate();
                    resolve(false);
                    break;
            }
        });
        worker.on("error", reject);
    });
}

/**
 * Run a piece of code at an accurate interval, compensating for the time taken by the code itself.
 * @param condition Condition for the loop to continue.
 * @param interval Interval in nanoseconds.
 * @param work The piece of code to run. The loop will stop if this returns false or a Promise that resolves to false.
 */
async function accurateInterval(
    condition: (index: number) => boolean,
    interval: bigint,
    work: (index: number) => Promise<boolean | void> | boolean | void
) {
    let lastRunTime = process.hrtime.bigint();
    let index = 1;
    while (condition(index)) {
        const currentTime = process.hrtime.bigint();
        const timeDifference = currentTime - lastRunTime;

        if (timeDifference > interval) {
            const result = await work(index);
            if (result === false) break;

            lastRunTime = currentTime;
            index++;
        }
    }
}

if (!isMainThread) {
    const { interval } = workerData as {
        interval: bigint;
    };
    parentPort?.on("message", (msg: Messages) => {
        switch (msg.signal) {
            case Signal.TERMINATE:
                condition = false;
        }
    });
    let condition = true;
    accurateInterval(
        () => condition,
        interval,
        (index) => {
            parentPort?.postMessage({ signal: Signal.WORK });
            parentPort?.postMessage({
                signal: Signal.COUNT,
                data: { index },
            });
            return true;
        }
    );
}
