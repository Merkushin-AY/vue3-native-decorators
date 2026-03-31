import { isReactive, isShallow, reactive, shallowReactive, toRaw } from "vue";

const serializableKeysMap = new WeakMap<object, Set<PropertyKey>>();

type Class = new (...args: any) => any;
const serializableClasses = new Map<string, Class>();

export function makeSerializable(target: Class) {
    serializableClasses.set(target.name, target);
}

export function serializable<T extends Class>(target: T, _context: ClassDecoratorContext<T>) {
    makeSerializable(target);
    return target;
}

const metadataKey = '__vnd_serializable_metadata';

export function toData(object: object) {
    const seen = new WeakMap<object, unknown>();

    function serialize(value: unknown): unknown {
        if (value === null || value === undefined) return value;
        if (typeof value !== 'object') return value;

        if (isReactive(value)) {
            const output: Record<string, unknown> = {};
            output[metadataKey] = isShallow(value) ? 'shallowReactive' : 'reactive';
            output.data = serialize(toRaw(value));
            return output;
        }

        const rawValue = toRaw(value);
        if (rawValue instanceof Date) return new Date(rawValue.getTime());

        if (seen.has(rawValue)) {
            return seen.get(rawValue);
        }

        if (Array.isArray(rawValue)) {
            const output: unknown[] = [];
            seen.set(rawValue, output);
            for (const item of rawValue) {
                output.push(serialize(item));
            }
            return output;
        }

        if (rawValue instanceof Set || rawValue instanceof Map) {
            const output: Record<string, unknown> = {};
            output[metadataKey] = rawValue instanceof Set ? 'Set' : 'Map';
            output.data = serialize(Array.from(rawValue)) as unknown[] | [unknown, unknown][];
            seen.set(rawValue, output);
            return output;
        }

        const source = rawValue as Record<string | symbol, unknown>;
        const output: Record<string, unknown> = {};
        seen.set(rawValue, output);

        if (serializableClasses.has(rawValue.constructor.name)) {
            output[metadataKey] = rawValue.constructor.name;
        }

        const keys = new Set<string>();
        const registeredKeys = serializableKeysMap.get(rawValue);
        if (registeredKeys) {
            for (const key of registeredKeys) {
                if (typeof key === 'string') keys.add(key);
            }
        }
        for (const key of Object.keys(source)) {
            keys.add(key);
        }
        // Decorated accessors are often non-enumerable on prototypes, so
        // include accessor keys as a fallback when metadata is unavailable.
        for (const key of getPrototypeAccessorKeys(rawValue)) {
            keys.add(key);
        }

        for (const key of keys) {
            output[key] = serialize(source[key]);
        }

        return output;
    }

    return serialize(object);
}

function getPrototypeAccessorKeys(target: object): string[] {
    const keys = new Set<string>();
    let current = Object.getPrototypeOf(target);

    while (current && current !== Object.prototype) {
        for (const name of Object.getOwnPropertyNames(current)) {
            if (name === 'constructor') continue;
            const descriptor = Object.getOwnPropertyDescriptor(current, name);
            if (!descriptor) continue;
            if (typeof descriptor.get === 'function' && typeof descriptor.set === 'function') {
                keys.add(name);
            }
        }
        current = Object.getPrototypeOf(current);
    }

    return [...keys];
}

function deserialize(value: unknown, into?: object): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (value instanceof Date) return new Date(value.getTime());

    if (Array.isArray(value)) {
        const output: unknown[] = Array.isArray(into) ? into : [];
        output.length = 0;
        for (const item of value) {
            output.push(deserialize(item));
        }
        return output;
    }

    const metaData = (value as Record<string, unknown>)[metadataKey] as string | undefined;

    if (metaData === 'shallowReactive') {
        return shallowReactive(deserialize((value as Record<string, unknown>).data) as object);
    } else if (metaData === 'reactive') {
        return reactive(deserialize((value as Record<string, unknown>).data) as object);
    } else if (metaData === 'Set') {
        const output = into instanceof Set ? into : new Set();
        for (const item of (value as Record<string, unknown>).data as unknown[]) {
            output.add(deserialize(item));
        }
        return output;
    } else if (metaData === 'Map') {
        const output = into instanceof Map ? into : new Map();
        for (const item of (value as Record<string, unknown>).data as [unknown, unknown][]) {
            output.set(deserialize(item[0]), deserialize(item[1]));
        }
        return output;
    } else if (metaData) {
        const Class = serializableClasses.get(metaData);
        if (Class || into) {
            const output = into ?? new Class!();
            for (const key of Object.keys(value)) {
                if (key === metadataKey) continue;
                const innerValue = (value as Record<string, unknown>)[key] as Record<string, unknown>;
                if (innerValue.metadataKey === 'shallowReactive' || innerValue.metadataKey === 'reactive') {
                    output[key] = deserialize(innerValue.data, output[key]);
                }
                output[key] = deserialize(innerValue);
            }
            return output;
        }
    }

    const output: Record<string, unknown> = into instanceof Object ? into as Record<string, unknown> : {};
    for (const key of Object.keys(value)) {
        if (key === metadataKey) continue;
        output[key] = deserialize((value as Record<string, unknown>)[key]);
    }
    return output;
}

export function fromData(data: unknown) {
    return deserialize(data);
}

export function patchObject(data: unknown, into: object) {
    return deserialize(data, into);
}