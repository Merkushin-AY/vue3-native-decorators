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

function dEffectFunction<This extends object, Value extends (this: This, onCleanup?: OnCleanup) => void>(
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

export function dEffect<This extends object, Value extends (this: This, onCleanup?: OnCleanup) => void>(
    target: Value,
    context: ClassMethodDecoratorContext<This, Value>,
): ReturnType<EffectFunction>;
export function dEffect(flush?: WatchEffectOptions['flush']): EffectFunction;
export function dEffect<This extends object, Value extends (this: This, onCleanup?: OnCleanup) => void>(
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
                    if (typeof source === 'function') {
                        source = source.bind(this);
                    }
                    const watchHandle = watch(source, target.bind(this), options);
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
    _isPending: Ref<boolean>;
    _abortListeners: (() => void)[];
    promise: Promise<R> | undefined;
    get isPending(): boolean;
    error: ShallowRef<Error | undefined>;
    result: ShallowRef<R | undefined>;
    resolve: ((value: R) => void) | undefined;
    reject: ((reason?: any) => void) | undefined;
    onAbort: (listener: () => void) => void;
    abort: () => void;
}

type PromiseFunction<R, A extends any[] = any[]> = PromiseMethod<Awaited<R>, A> & PromiseObject<Awaited<R>>;
type ObjectWithPromise<T extends PropertyKey, R = any> = { [K in T]: PromiseFunction<R> };
export type DecoratedPromise<F extends PromiseMethod<any>> = PromiseFunction<Awaited<ReturnType<F>>, Parameters<F>>;


const promiseMap = new WeakMap<object, WeakMap<PromiseMethod<any>, PromiseObject<any>>>();

export function getPromiseData<R, T extends PropertyKey, C extends ObjectWithPromise<T, R>>(
    context: C,
    targetName: T,
): PromiseObject<R> | undefined {
    const target = context[targetName];
    return promiseMap.get(context)?.get(target) as PromiseObject<R> | undefined;
}

function setPromiseObject<R>(context: object, target: PromiseMethod<R>, promiseObject: PromiseObject<R>) {
    if (!promiseMap.has(context)) {
        promiseMap.set(context, new WeakMap());
    }
    promiseMap.get(context)?.set(target, promiseObject);
}

function makePromiseObject<R, T extends PropertyKey, C extends ObjectWithPromise<T, R>>(
    context: C,
    targetName: T,
    target: C[T],
): PromiseObject<R> {
    let promiseObject: PromiseObject<R> | undefined = getPromiseData(context, targetName);
    if (promiseObject) return promiseObject;

    promiseObject = {
        promise: undefined,
        _isPending: ref(false),
        error: shallowRef<Error | undefined>(undefined),
        result: shallowRef<R | undefined>(undefined),
        resolve: undefined,
        reject: undefined,
        get isPending() {
            return promiseObject!._isPending.value;
        },
        _abortListeners: [],
        onAbort: (listener: () => void) => {
            promiseObject!._abortListeners.push(listener);
        },
        abort: () => {
            abortPromise(promiseObject as PromiseObject<unknown>);
        },
    };

    setPromiseObject(context, target, promiseObject);
    return promiseObject;
}

function abortPromise(promiseObject: PromiseObject<unknown>) {
    if (!promiseObject.isPending) return;
    promiseObject._abortListeners.forEach((listener) => listener());
    promiseObject._abortListeners.length = 0;
    promiseObject.reject?.(new Error('Aborted'));
}

export function abort<R, T extends PropertyKey, C extends ObjectWithPromise<T, R>>(context: C, targetName: T) {
    const promiseObject = getPromiseData<R, T, C>(context, targetName);
    if (!promiseObject) throw new Error('Promise object not found');
    abortPromise(promiseObject as PromiseObject<unknown>);
}

export function onAbort<R, T extends PropertyKey, C extends ObjectWithPromise<T, R>>(
    context: C,
    targetName: T,
    listener: () => void,
) {
    const promiseObject = getPromiseData<R, T, C>(context, targetName);
    if (!promiseObject) throw new Error('Promise object not found');
    promiseObject.onAbort(listener);
}

export function isPromisePending<R, T extends PropertyKey, C extends ObjectWithPromise<T, R>>(
    context: C,
    targetName: T,
): boolean {
    const promiseObject = getPromiseData<R, T, C>(context, targetName);
    if (!promiseObject) throw new Error('Promise object not found');
    return promiseObject.isPending;
}

export function getPromiseError<R, T extends PropertyKey, C extends ObjectWithPromise<T, R>>(
    context: C,
    targetName: T,
): Error | undefined {
    const promiseObject = getPromiseData<R, T, C>(context, targetName);
    if (!promiseObject) throw new Error('Promise object not found');
    return promiseObject.error.value;
}

export function getPromiseResult<R, T extends PropertyKey, C extends ObjectWithPromise<T, R>>(
    context: C,
    targetName: T,
): R | undefined {
    const promiseObject = getPromiseData<R, T, C>(context, targetName);
    if (!promiseObject) throw new Error('Promise object not found');
    return promiseObject.result.value;
}

export function dPromise<R, This extends object, Value extends (this: This, ...args: unknown[]) => Promise<R>>(
    target: Value,
    context: ClassMethodDecoratorContext<This, Value>,
): Value {
    context.addInitializer(function (this: This) {
        let promiseObject: PromiseObject<R>;

        function makePromise(this: This, ...args: Parameters<Value>): Promise<R> {
            if (!promiseObject)
                promiseObject = makePromiseObject(
                    this as ObjectWithPromise<PropertyKey, R>,
                    context.name,
                    target as unknown as PromiseFunction<R, Parameters<Value>>,
                );
            if (promiseObject.promise) return promiseObject.promise;
            promiseObject._isPending.value = true;
            promiseObject.error.value = undefined;
            promiseObject.result.value = undefined;
            promiseObject.promise = new Promise<R>((resolve, reject) => {
                promiseObject.resolve = resolve;
                promiseObject.reject = reject;
                target.call(this, ...args).then(resolve, reject);
            })
                .then((result) => {
                    promiseObject.result.value = result;
                    return result;
                })
                .catch((error) => {
                    promiseObject.error.value = error;
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

        let name = context.name;
        if (typeof name === 'string' && METHOD_PREFIXES.some((prefix) => (name as string).startsWith(prefix))) {
            name = name.slice(METHOD_PREFIXES[0].length);
        }
        // @ts-expect-error - We know this is safe due to the type definitions
        this[name] = makePromise;
    });

    return target;
}
