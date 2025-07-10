import { watchEffect, type WatchEffectOptions } from 'vue';
import {
    computed,
    type ComputedRef,
    effectScope,
    type EffectScope,
    type OnCleanup,
    reactive,
    ref,
    type Ref,
    shallowReactive,
    type ShallowRef,
    shallowRef,
    watch,
    type WatchCallback,
    type WatchHandle,
    type WatchOptions,
    type WatchSource,
    // eslint-disable-next-line vue/prefer-import-from-vue
} from '@vue/reactivity';

type PropertyKey = string | symbol;

export const METHOD_PREFIXES = ['$D', '_$D'];

const scopes = new WeakMap<object, EffectScope>();

export function makeObjectScope(object: object) {
    let scope = scopes.get(object);
    if (!scope) {
        scope = effectScope();
        scopes.set(object, scope);
    }
    return scope;
}

export function disposeObjectScope(object: object) {
    const scope = scopes.get(object);
    if (scope) {
        scope.stop();
        scopes.delete(object);
    }
}

/**
 * Provides vue reactivity for class property accessors. Makes property ref.
 * Example:
 * `@dRef accessor name = '';`
 */
export function dRef<This, Value = unknown>(
    target: ClassAccessorDecoratorTarget<This, Value>,
): ClassAccessorDecoratorResult<This, Value> {
    return {
        init(value) {
            return ref(value) as Value;
        },

        get() {
            return (target.get.call(this) as Ref<Value>).value;
        },

        set(newValue) {
            const ref = target.get.call(this) as Ref<Value>;
            ref.value = newValue;
        },
    };
}

/**
 * Provides vue reactivity for class property accessors. Makes property shallowRef.
 * Example:
 * `@dShallowRef accessor name = '';`
 */
export function dShallowRef<This, Value = unknown>(
    target: ClassAccessorDecoratorTarget<This, Value>,
): ClassAccessorDecoratorResult<This, Value> {
    return {
        init(value) {
            return shallowRef(value) as Value;
        },

        get() {
            return (target.get.call(this) as Ref<Value>).value;
        },

        set(newValue) {
            const ref = target.get.call(this) as Ref<Value>;
            ref.value = newValue;
        },
    };
}

/**
 * Provides vue reactivity for class property accessors. Makes property shallow reactive.
 * Example:
 * `@dShallowReactive messages: Message[] = [];`
 * Prefer to use this over dReactive when property contains other reactive entities.
 */
export function dShallowReactive<This extends object, Value extends object>(
    _target: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
) {
    context.addInitializer(function () {
        // @ts-expect-error I very want to write into generic
        this[context.name] = shallowReactive(this[context.name]);
    });
}

/**
 * Provides vue reactivity for class property accessors. Makes property reactive.
 * Example:
 * `@dReactive messages: string[] = [];`
 */
export function dReactive<This extends object, Value extends object>(
    _target: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
) {
    context.addInitializer(function () {
        // @ts-expect-error I very want to write into generic
        this[context.name] = reactive(this[context.name]);
    });
}

const computedMap = new WeakMap<object, Record<string | symbol, ComputedRef>>();

/**
 * Provides vue reactivity for class property accessors. Makes getter computed.
 * Example:
 * `@dComputed get fullName() {
 *      return this.name + this.secondName;
 * }`
 */
export function dComputed<This extends object, Value = unknown>(
    target: (this: This) => Value,
    context: ClassGetterDecoratorContext<This, Value>,
) {
    context.addInitializer(function (this: This) {
        if (!computedMap.has(this)) {
            computedMap.set(this, {});
        }
        computedMap.get(this)![context.name] = computed(target.bind(this));
    });

    return function (this: This) {
        if (!computedMap.has(this)) throw new Error('Computed decorator lost its value');
        return computedMap.get(this)![context.name].value;
    };
}

type WatcherFunction = (...args: any[]) => any;
type ObjectWithWatcher<T extends PropertyKey> = { [K in T]: WatcherFunction };

const watchersMap = new WeakMap<object, WeakMap<WatcherFunction, WatchHandle>>();

function setWatcher(context: object, target: WatcherFunction, handle: WatchHandle) {
    if (!watchersMap.has(context)) {
        watchersMap.set(context, new WeakMap());
    }
    watchersMap.get(context)!.set(target, handle);
}

export function stopWatcher<T extends PropertyKey, C extends ObjectWithWatcher<T>>(context: C, targetName: T) {
    const target = context[targetName];
    const watchHandle = watchersMap.get(context)?.get(target);
    if (watchHandle) watchHandle.stop();
}

export function pauseWatcher<T extends PropertyKey, C extends ObjectWithWatcher<T>>(context: C, targetName: T) {
    const target = context[targetName];
    const watchHandle = watchersMap.get(context)?.get(target);
    if (watchHandle) watchHandle.pause();
}

export function resumeWatcher<T extends PropertyKey, C extends ObjectWithWatcher<T>>(context: C, targetName: T) {
    const target = context[targetName];
    const watchHandle = watchersMap.get(context)?.get(target);
    if (watchHandle) watchHandle.resume();
}

function dEffectFunction<This extends object, Value extends (this: This, onCleanup?: OnCleanup) => any>(
    target: Value,
    context: ClassMethodDecoratorContext<This, Value>,
    flush?: WatchEffectOptions['flush'],
): Value {
    context.addInitializer(function (this: This) {
        queueMicrotask(() => {
            const scope = makeObjectScope(this);
            scope.run(() => {
                const watchHandle = watchEffect(target.bind(this), { flush });
                setWatcher(this, target as WatcherFunction, watchHandle);
            });
        });
    });

    return target;
}

type EffectFunction = typeof dEffectFunction;

export function dEffect<This extends object, Value extends (this: This, onCleanup?: OnCleanup) => any>(
    target: Value,
    context: ClassMethodDecoratorContext<This, Value>,
): ReturnType<EffectFunction>;
export function dEffect(flush?: WatchEffectOptions['flush']): EffectFunction;
export function dEffect<This extends object, Value extends (this: This, onCleanup?: OnCleanup) => any>(
    targetOrFlush?: Value | WatchEffectOptions['flush'],
    context?: ClassMethodDecoratorContext<This, Value>,
) {
    if (context) {
        return dEffectFunction(targetOrFlush as Value, context);
    }

    return (target: Value, context: ClassMethodDecoratorContext<This, Value>) => {
        return dEffectFunction(target, context, targetOrFlush as WatchEffectOptions['flush']);
    };
}

export function dWatch<T>(source: WatchSource<T>, options?: WatchOptions) {
    return function dWatch<This extends object, Value extends WatchCallback<T, T | undefined>>(
        target: Value,
        context: ClassMethodDecoratorContext<This, Value>,
    ) {
        context.addInitializer(function (this: This) {
            queueMicrotask(() => {
                const scope = makeObjectScope(this);
                scope.run(() => {
                    let thisSource = source;
                    if (typeof thisSource === 'function') {
                        thisSource = thisSource.bind(this);
                    }
                    const watchHandle = watch(thisSource, target.bind(this), options);
                    setWatcher(this, target as WatcherFunction, watchHandle);
                });
            });
        });
        return target;
    };
}

// Add these type definitions before the dPromise decorator
export type PromiseMethod<R, A extends any[] = any[]> = (...args: A) => Promise<R>;
export interface PromiseObject<R> {
    _isDPromise: true;
    _abortListeners: (() => void)[];
    _isPending: Ref<boolean>;
    _error: ShallowRef<Error | undefined>;
    _result: ShallowRef<R | undefined>;
    promise: Promise<R> | undefined;
    get isPending(): boolean;
    get error(): Error | undefined;
    get result(): R | undefined;
    resolve: ((value: R) => void) | undefined;
    reject: ((reason?: any) => void) | undefined;
    onAbort: (listener: () => void) => void;
    abort: () => void;
}

type DecoratedPromiseFunction<R, A extends any[] = any[]> = PromiseMethod<Awaited<R>, A> & PromiseObject<Awaited<R>>;
export type DecoratedPromise<F extends PromiseMethod<any>> = DecoratedPromiseFunction<Awaited<ReturnType<F>>, Parameters<F>>;

function assignPromiseObject<R, T extends object = object>(target: T): T & PromiseObject<R> {
    const promiseObject = Object.assign(target, {
        _isDPromise: true,
        promise: undefined,
        _isPending: ref(false),
        _error: shallowRef<Error | undefined>(undefined),
        _result: shallowRef<R | undefined>(undefined),
        resolve: undefined,
        reject: undefined,
        _abortListeners: [],
        onAbort: (listener: () => void) => {
            (target as PromiseObject<R>)._abortListeners!.push(listener);
        },
        abort: () => {
            abortPromise(target as PromiseObject<unknown>);
        },
    }) as T & PromiseObject<R>;

    Object.defineProperty(promiseObject, 'isPending', {
        get() {
            return promiseObject._isPending.value;
        },
        enumerable: false,
        configurable: false,
    });

    Object.defineProperty(promiseObject, 'error', {
        get() {
            return promiseObject._error.value;
        },
        enumerable: false,
        configurable: false,
    });

    Object.defineProperty(promiseObject, 'result', {
        get() {
            return promiseObject._result.value;
        },
        enumerable: false,
        configurable: false,
    });

    return promiseObject;
}

export class AbortError extends Error {
    constructor() {
        super('Aborted');
    }
}

function abortPromise(promiseObject: PromiseObject<unknown>) {
    if (!promiseObject.isPending) return;
    promiseObject._abortListeners.forEach((listener) => listener());
    promiseObject._abortListeners.length = 0;
    promiseObject.reject?.(new AbortError());
}

export function abort(method: (...args: any[]) => Promise<any>) {
    if (!('_isDPromise' in method) || !method._isDPromise) throw new Error('Promise object not found');
    abortPromise(method as unknown as PromiseObject<unknown>);
}

export function onAbort(method: (...args: any[]) => Promise<any>, listener: () => void) {
    if (!('_isDPromise' in method) || !method._isDPromise) throw new Error('Promise object not found');
    (method as unknown as PromiseObject<unknown>).onAbort(listener);
}

export function isPromisePending(method: (...args: any[]) => Promise<any>): boolean {
    if (!('_isDPromise' in method) || !method._isDPromise) throw new Error('Promise object not found');
    return (method as unknown as PromiseObject<unknown>).isPending;
}

export function getPromiseError(method: (...args: any[]) => Promise<any>): Error | undefined {
    if (!('_isDPromise' in method) || !method._isDPromise) throw new Error('Promise object not found');
    return (method as unknown as PromiseObject<unknown>).error;
}

export function getPromiseResult<R>(method: (...args: any[]) => Promise<R>): R | undefined {
    if (!('_isDPromise' in method) || !method._isDPromise) throw new Error('Promise object not found');
    return (method as unknown as PromiseObject<R>).result;
}

export function initPromiseObject<R>(method: (...args: any[]) => Promise<R>): PromiseObject<R> {
    return assignPromiseObject<R>(method);
}

function dPromiseFunction<R, This extends object, Value extends (this: This, ...args: any[]) => Promise<any>>(
    target: Value,
    context: ClassMethodDecoratorContext<This, Value>,
    eagerInit?: boolean,
): Value {
    context.addInitializer(function (this: This) {
        let promiseObject: PromiseObject<R>;

        function makePromise(this: This, ...args: Parameters<Value>): Promise<R> {
            if (!promiseObject) {
                promiseObject = assignPromiseObject<R>(makePromise);
            }

            if (promiseObject.promise) return promiseObject.promise;
            
            promiseObject.promise = new Promise<R>((resolve, reject) => {
                promiseObject._isPending.value = true;
                promiseObject._error.value = undefined;
                promiseObject._result.value = undefined;
                promiseObject.resolve = resolve;
                promiseObject.reject = reject;
                target.call(this, ...args).then(resolve, reject);
            })
                .then((result) => {
                    promiseObject._result.value = result;
                    return result;
                })
                .catch((error) => {
                    promiseObject._error.value = error;
                    throw error;
                })
                .finally(() => {
                    promiseObject.promise = undefined;
                    promiseObject.resolve = undefined;
                    promiseObject.reject = undefined;
                    promiseObject._abortListeners.length = 0;
                    promiseObject._isPending.value = false;
                });
            return promiseObject.promise;
        }

        if (eagerInit) {
            promiseObject = assignPromiseObject<R>(makePromise);
        }

        let name = context.name;
        if (typeof name === 'string') {
            for (const prefix of METHOD_PREFIXES) {
                if (!name.startsWith(prefix)) continue;
                name = name.slice(prefix.length);
                break;
            }
        }

        // @ts-expect-error - We know this is safe due to the type definitions
        this[name] = makePromise;
    });

    return target;
}

type PromiseFunction = typeof dPromiseFunction;

export function dPromise(eagerInit?: boolean): PromiseFunction;
export function dPromise<R, This extends object, Value extends (this: This, ...args: any[]) => Promise<R>>(
    target: Value,
    context: ClassMethodDecoratorContext<This, Value>,
): ReturnType<PromiseFunction>;
export function dPromise<R, This extends object, Value extends (this: This, ...args: any[]) => Promise<R>>(
    targetOrEagerInit?: Value | boolean,
    context?: ClassMethodDecoratorContext<This, Value>,
) {
    if (context) {
        return dPromiseFunction(targetOrEagerInit as Value, context);
    }

    return (target: Value, context: ClassMethodDecoratorContext<This, Value>) => {
        return dPromiseFunction(target, context, targetOrEagerInit as boolean);
    };
}
