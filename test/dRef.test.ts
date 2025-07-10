import { describe, it, expect, beforeEach } from 'vitest';
import { computed, watch } from 'vue';
import { dRef } from '../src/index';

describe('dRef', () => {
    it('should create a ref for accessor property', () => {
        class TestClass {
            @dRef accessor value = 42;
        }

        const instance = new TestClass();
        expect(instance.value).toBe(42);
    });

    it('should allow setting and getting values', () => {
        class TestClass {
            @dRef accessor value = 0;
        }

        const instance = new TestClass();
        instance.value = 100;
        expect(instance.value).toBe(100);
    });

    it('should be reactive with computed', () => {
        class TestClass {
            @dRef accessor count = 0;
        }

        const instance = new TestClass();
        const doubled = computed(() => instance.count * 2);

        expect(doubled.value).toBe(0);
        instance.count = 5;
        expect(doubled.value).toBe(10);
    });

    it('should be reactive with watch', async () => {
        class TestClass {
            @dRef accessor count = 0;
        }

        const instance = new TestClass();
        let watchedValue = 0;

        watch(
            () => instance.count,
            (newValue) => {
                watchedValue = newValue;
            },
        );

        instance.count = 42;

        // Wait for next tick to allow watch to execute
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(watchedValue).toBe(42);
    });

    it('should work with different data types', () => {
        class TestClass {
            @dRef accessor stringValue = 'hello';
            @dRef accessor numberValue = 123;
            @dRef accessor booleanValue = true;
            @dRef accessor objectValue = { key: 'value' };
            @dRef accessor arrayValue = [1, 2, 3];
        }

        const instance = new TestClass();

        expect(instance.stringValue).toBe('hello');
        expect(instance.numberValue).toBe(123);
        expect(instance.booleanValue).toBe(true);
        expect(instance.objectValue).toEqual({ key: 'value' });
        expect(instance.arrayValue).toEqual([1, 2, 3]);
    });

    it('should handle multiple instances independently', () => {
        class TestClass {
            @dRef accessor value = 0;
        }

        const instance1 = new TestClass();
        const instance2 = new TestClass();

        instance1.value = 10;
        instance2.value = 20;

        expect(instance1.value).toBe(10);
        expect(instance2.value).toBe(20);
    });
});
