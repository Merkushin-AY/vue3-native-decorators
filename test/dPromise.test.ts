import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    dPromise,
    isPromisePending,
    getPromiseResult,
    getPromiseError,
    abort,
    onAbort,
    DecoratedPromise,
    AbortError,
} from '../src/index';

describe('dPromise', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should return promise and support its methods', async () => {
        class TestClass {
            @dPromise
            async fetchData() {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'result';
            }
        }

        const instance = new TestClass();
        await instance.fetchData().then((result) => {
            expect(result).toEqual('result');
        });
    });

    it('should return same promise for multiple calls', async () => {
        class TestClass {
            @dPromise
            async fetchData() {
                await new Promise(resolve => setTimeout(resolve, 10));
                return Math.random();
            }
        }

        const instance = new TestClass();
        const promise1 = instance.fetchData();
        const promise2 = instance.fetchData();
        expect(promise1).toBe(promise2);
        const results = await Promise.all([promise1, promise2]);
        expect(results[0]).toBe(results[1]);
    });

    it('should return same promise for multiple calls with instant init', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData() {
                await new Promise(resolve => setTimeout(resolve, 10));
                return Math.random();
            }
        }

        const instance = new TestClass();
        const promise1 = instance.fetchData();
        const promise2 = instance.fetchData();
        expect(promise1).toBe(promise2);
        const results = await Promise.all([promise1, promise2]);
        expect(results[0]).toBe(results[1]);
    });

    it('should return same promise for multiple calls with parameters', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData(arg: string) {
                return arg;
            }
        }

        const instance = new TestClass();
        const promise1 = instance.fetchData('test1');
        const promise2 = instance.fetchData('test2');
        expect(promise1).toBe(promise2);
        const results = await Promise.all([promise1, promise2]);
        expect(results[0]).toBe('test1');
        expect(results[1]).toBe('test1');
    });

    it('should wrap async method with reactive state', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData() {
                await new Promise(resolve => setTimeout(resolve, 10));
                return { id: 1, name: 'test' };
            }
        }

        const instance = new TestClass();
        expect(isPromisePending(instance.fetchData)).toBe(false);
        expect(getPromiseResult(instance.fetchData)).toBeUndefined();
        expect(getPromiseError(instance.fetchData)).toBeUndefined();

        const promise = instance.fetchData();
        expect(isPromisePending(instance.fetchData)).toBe(true);
        expect(getPromiseResult(instance.fetchData)).toBeUndefined();
        expect(getPromiseError(instance.fetchData)).toBeUndefined();

        const result = await promise;
        expect(isPromisePending(instance.fetchData)).toBe(false);
        expect(result).toEqual({ id: 1, name: 'test' });
        expect(getPromiseResult(instance.fetchData)).toEqual({ id: 1, name: 'test' });
        expect(getPromiseError(instance.fetchData)).toBeUndefined();
    });

    it('should wrap sync promise method with reactive state', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData() {
                return { id: 1, name: 'test' };
            }
        }

        const instance = new TestClass();
        expect(isPromisePending(instance.fetchData)).toBe(false);
        expect(getPromiseResult(instance.fetchData)).toBeUndefined();
        expect(getPromiseError(instance.fetchData)).toBeUndefined();

        const promise = instance.fetchData();
        expect(isPromisePending(instance.fetchData)).toBe(true);
        expect(getPromiseResult(instance.fetchData)).toBeUndefined();
        expect(getPromiseError(instance.fetchData)).toBeUndefined();

        const result = await promise;
        expect(isPromisePending(instance.fetchData)).toBe(false);
        expect(result).toEqual({ id: 1, name: 'test' });
        expect(getPromiseError(instance.fetchData)).toBeUndefined();
    });

    it('should handle promise errors', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData() {
                throw new Error('Network error');
            }
        }

        const instance = new TestClass();

        try {
            await instance.fetchData();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('Network error');
        }

        expect(isPromisePending(instance.fetchData)).toBe(false);
        expect(getPromiseError(instance.fetchData)).toBeInstanceOf(Error);
        expect(getPromiseError(instance.fetchData)?.message).toBe('Network error');
    });

    it('should handle multiple instances independently', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData() {
                await new Promise(resolve => setTimeout(resolve, 0));
                return { id: Math.random() };
            }
        }

        const instance1 = new TestClass();
        const instance2 = new TestClass();

        const promise1 = instance1.fetchData();
        const promise2 = instance2.fetchData();

        expect(isPromisePending(instance1.fetchData)).toBe(true);
        expect(isPromisePending(instance2.fetchData)).toBe(true);

        await Promise.all([promise1, promise2]);

        expect(isPromisePending(instance1.fetchData)).toBe(false);
        expect(isPromisePending(instance2.fetchData)).toBe(false);
    });

    it('should support abort functionality', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData() {
                return new Promise((resolve) => {
                    setTimeout(() => resolve({ id: 1 }), 1000);
                });
            }
        }

        const instance = new TestClass();

        const promise = instance.fetchData();
        expect(isPromisePending(instance.fetchData)).toBe(true);

        abort(instance.fetchData);

        try {
            await promise;
        } catch (error) {
            expect(error).toBeInstanceOf(AbortError);
            expect(error.message).toBe('Aborted');
        }

        expect(isPromisePending(instance.fetchData)).toBe(false);
    });

    it('should support abort listeners', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData() {
                return { id: 1 };
            }
        }

        const instance = new TestClass();
        let abortCalled = false;

        onAbort(instance.fetchData, () => {
            abortCalled = true;
        });

        instance.fetchData().catch((e) => {
            expect(e).toBeInstanceOf(AbortError);
            expect(e.message).toBe('Aborted');
        });

        abort(instance.fetchData);
        expect(abortCalled).toBe(true);
    });

    it('should work with prefixed method names', async () => {
        interface TestClass {
            fetchData: DecoratedPromise<TestClass['_$DfetchData']>;
        }

        class TestClass {
            @dPromise(true)
            async _$DfetchData() {
                return { id: 1, name: 'test' };
            }
        }

        const instance = new TestClass();

        const promise = instance.fetchData();
        expect(instance.fetchData.isPending).toBe(true);

        const result = await promise;
        expect(result).toEqual({ id: 1, name: 'test' });
        expect(instance.fetchData.isPending).toBe(false);
        expect(instance.fetchData.result).toEqual({ id: 1, name: 'test' });
    });

    it('should handle concurrent calls', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData() {
                return { id: Date.now() };
            }
        }

        const instance = new TestClass();

        const promise1 = instance.fetchData();
        const promise2 = instance.fetchData();

        // Second call should return the same promise
        expect(promise1).toBe(promise2);

        const result = await promise1;
        expect(result).toHaveProperty('id');
    });

    it('should handle promise with parameters', async () => {
        class TestClass {
            @dPromise(true)
            async fetchData(id: number, name: string) {
                return { id, name };
            }
        }

        const instance = new TestClass();

        const result = await instance.fetchData(1, 'test');
        expect(result).toEqual({ id: 1, name: 'test' });
        expect(getPromiseResult(instance.fetchData)).toEqual({ id: 1, name: 'test' });
    });
});
