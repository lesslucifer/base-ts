import AsyncLock from 'async-lock';

class Lock {
    private asyncLock = new AsyncLock();

    async acquire(key: string | string[], opts?: any) {
        return new Promise<LockKey>((res, rej) => {
            const lockKey = new LockKey(this);
            return this.asyncLock.acquire(key, (done) => {
                lockKey.__done = done;
                res(lockKey);
            }, opts);
        })
    }

    isBusy(key: string) {
        return this.asyncLock.isBusy(key);
    }

    async guard<T>(key: string | string[], f: () => Promise<T>) {
        let _key: LockKey;
        try {
            _key = await this.acquire(key);
            return await f();
        }
        finally {
            _key && await _key.unlock();
        }
    }
}

export class LockKey {
    __done: (err, ret) => any;

    constructor(public lock: Lock) {}

    async unlock() {
        return this.__done(undefined, undefined);
    }
}

export default Lock;