import { describe, it, expect, vi } from 'vitest';
import { dComputed, dReactive, dRef, dShallowReactive, dShallowRef } from '../src/index';
import { serializable, toData, fromData } from '../src/serialization';

describe('Serialization', () => {
    // it('should create object scope', () => {
    //     @serializable
    //     class TestClass {
    //         @dRef accessor value = 42;
    //         @dRef accessor nested = { value: 42 };
    //         @dRef accessor array = [1, 2, 3];
    //         @dRef accessor string = 'hello';
    //         @dRef accessor number = 42;
    //         @dRef accessor boolean = true;
    //         @dRef accessor null = null;
    //         @dRef accessor undefined = undefined;
    //     }

    //     const instance = new TestClass();
    //     const data = toData(instance);
    //     expect(data).toEqual({
    //         value: 42,
    //         nested: { value: 42 },
    //         array: [1, 2, 3],
    //         string: 'hello',
    //         number: 42,
    //         boolean: true,
    //         null: null,
    //         undefined: undefined,
    //     });
    // });

    // it('should serialize nested objects', () => {
    //     @serializable
    //     class NestedClass {
    //         @dRef accessor value = 42;
    //     }

    //     @serializable
    //     class TestClass {
    //         @dRef accessor ownValue = 42;
    //         @dShallowRef accessor nested = new NestedClass();
    //     }

        

    //     const instance = new TestClass();
    //     instance.nested = new NestedClass();
    //     const serialized = toData(instance);
    //     expect(serialized).toEqual({ ownValue: 42, nested: { value: 42 } });
    // });

    // it('should serialize complex objects', () => {
    //     @serializable
    //     class TestClass {
    //         @dRef accessor set1 = new Set([1, 2, 3]);
    //         @dReactive set2 = new Set([1, 2, 3]);

    //         @dRef accessor map1 = new Map([['a', 1], ['b', 2], ['c', 3]]);
    //         @dReactive map2 = new Map([['a', 1], ['b', 2], ['c', 3]]);
    //     }

    //     const instance = new TestClass();
    //     const data = toData(instance);
    //     expect(data).toEqual({
    //         set1: [1, 2, 3],
    //         set2: [1, 2, 3],
    //         map1: ['a', 1, 'b', 2, 'c', 3],
    //         map2: ['a', 1, 'b', 2, 'c', 3],
    //     });
    // });

    it('should deserialize data', () => {
        @serializable
        class TestClass {
            @dRef accessor someValue = 42;
            @dComputed get someComputedValue() {
                return this.someValue + 1;
            }
        }

        const data = toData(new TestClass());
        const instance = fromData(data) as TestClass;
        expect(instance.someValue).toBe(42);
        expect(instance.someComputedValue).toBe(43);
    });


    it('should deserialize nested data', () => {
        @serializable
        class NestedClass {
            @dRef accessor someValue = 42;
        }

        @serializable
        class TestClass {
            @dShallowRef accessor someNested = new NestedClass();
            @dComputed get someComputedValue() {
                return this.someNested.someValue + 1;
            }
        }

        const data = toData(new TestClass());
        const instance = fromData(data) as TestClass;
        expect(instance.someNested.someValue).toBe(42);
        expect(instance.someComputedValue).toBe(43);
        instance.someNested.someValue = 22;
        expect(instance.someComputedValue).toBe(23);
    });

    it('should serialize and deserialize nested Set with mixed primitives and objects', () => {
        @serializable
        class TestClass {
            @dRef accessor mixedSet = new Set<unknown>([
                1,
                'two',
                true,
                { kind: 'plain', id: 1 },
                [3, { deep: 'value' }],
                new Map<unknown, unknown>([
                    ['x', 10],
                    ['obj', { y: 20 }],
                ]),
            ]);
        }

        const data = toData(new TestClass());
        const instance = fromData(data) as TestClass;
        const values = [...instance.mixedSet];

        expect(instance.mixedSet).toBeInstanceOf(Set);
        expect(values[0]).toBe(1);
        expect(values[1]).toBe('two');
        expect(values[2]).toBe(true);
        expect(values[3]).toEqual({ kind: 'plain', id: 1 });
        expect(values[4]).toEqual([3, { deep: 'value' }]);
        expect(values[5]).toBeInstanceOf(Map);
        expect((values[5] as Map<unknown, unknown>).get('x')).toBe(10);
        expect((values[5] as Map<unknown, unknown>).get('obj')).toEqual({ y: 20 });
    });

    it('should serialize and deserialize nested Map with arrays containing mixed values', () => {
        @serializable
        class TestClass {
            @dRef accessor mixedMap = new Map<string, unknown>([
                [
                    'arrayValue',
                    [
                        1,
                        'two',
                        { kind: 'object', meta: { a: 1 } },
                        new Set<unknown>([false, { nested: 'set-object' }]),
                    ],
                ],
                [
                    'setValue',
                    new Set<unknown>([0, 'one', { nested: 'value' }, [2, { three: 3 }]]),
                ],
            ]);
        }

        const data = toData(new TestClass());
        const instance = fromData(data) as TestClass;
        const arrayValue = instance.mixedMap.get('arrayValue') as unknown[];
        const setValue = instance.mixedMap.get('setValue') as Set<unknown>;
        const setValues = [...setValue];

        expect(instance.mixedMap).toBeInstanceOf(Map);
        expect(arrayValue[0]).toBe(1);
        expect(arrayValue[1]).toBe('two');
        expect(arrayValue[2]).toEqual({ kind: 'object', meta: { a: 1 } });
        expect(arrayValue[3]).toBeInstanceOf(Set);
        expect([...(arrayValue[3] as Set<unknown>)]).toEqual([false, { nested: 'set-object' }]);

        expect(setValue).toBeInstanceOf(Set);
        expect(setValues).toEqual([0, 'one', { nested: 'value' }, [2, { three: 3 }]]);
    });

    it('should serialize and deserialize nested class instances with reactive props', () => {
        @serializable
        class ChildClass {
            @dReactive state = { count: 1, flags: ['a'] };
            @dComputed get summary() {
                return `${this.state.count}:${this.state.flags.join(',')}`;
            }
        }

        @serializable
        class ParentClass {
            @dRef accessor title = 'root';
            @dShallowRef accessor child = new ChildClass();
            @dComputed get childSummary() {
                return `${this.title}:${this.child.summary}`;
            }
        }

        const data = toData(new ParentClass());
        const instance = fromData(data) as ParentClass;

        expect(instance.child).toBeInstanceOf(ChildClass);
        expect(instance.child.state).toEqual({ count: 1, flags: ['a'] });
        expect(instance.child.summary).toBe('1:a');
        expect(instance.childSummary).toBe('root:1:a');

        instance.child.state.count = 4;
        instance.child.state.flags.push('b');
        expect(instance.child.summary).toBe('4:a,b');
        expect(instance.childSummary).toBe('root:4:a,b');
    });

    it('should serialize and deserialize mixed collections containing nested class instances with reactive props', () => {
        @serializable
        class ItemClass {
            @dRef accessor name = '';
            @dReactive state = { score: 0, tags: [] as string[] };
            constructor(name: string, score: number, tags: string[]) {
                this.name = name;
                this.state.score = score;
                this.state.tags = tags;
            }
        }

        @serializable
        class HolderClass {
            @dShallowRef accessor mixedList: unknown[] = [
                10,
                'plain',
                new ItemClass('first', 11, ['x']),
                { plain: true },
            ];
            @dShallowRef accessor mixedMap = new Map<string, unknown>([
                ['item', new ItemClass('second', 22, ['y', 'z'])],
                ['value', 99],
            ]);
            @dShallowReactive arList: ItemClass[] = [
                new ItemClass('third', 33, ['w']),
                new ItemClass('fourth', 44, ['v']),
                new ItemClass('fifth', 55, ['u']),
            ];

            @dComputed get listSummary() {
                return this.arList.reduce((acc, item) => acc + item.state.score, 0);
            }
        }

        const data = toData(new HolderClass());
        const instance = fromData(data) as HolderClass;
        const listItem = instance.mixedList[2] as ItemClass;
        const mapItem = instance.mixedMap.get('item') as ItemClass;

        expect(listItem).toBeInstanceOf(ItemClass);
        expect(listItem.name).toBe('first');
        expect(listItem.state).toEqual({ score: 11, tags: ['x'] });

        expect(mapItem).toBeInstanceOf(ItemClass);
        expect(mapItem.name).toBe('second');
        expect(mapItem.state).toEqual({ score: 22, tags: ['y', 'z'] });

        listItem.state.score = 12;
        mapItem.state.tags.push('extra');
        expect(listItem.state.score).toBe(12);
        expect(mapItem.state.tags).toEqual(['y', 'z', 'extra']);

        expect(instance.arList[1].name).toEqual('fourth');
        expect(instance.listSummary).toBe(132);
    });
});
