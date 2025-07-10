import { describe, it, expect } from 'vitest';
import { dRef, dComputed } from '../src/index';

describe('dComputed', () => {
    it('should create a computed getter', () => {
        class TestClass {
            @dRef accessor firstName = 'John';
            @dRef accessor lastName = 'Doe';

            @dComputed get fullName() {
                return `${this.firstName} ${this.lastName}`;
            }
        }

        const instance = new TestClass();
        expect(instance.fullName).toBe('John Doe');
    });

    it('should be reactive when dependencies change', () => {
        class TestClass {
            @dRef accessor count = 0;

            @dComputed get doubled() {
                return this.count * 2;
            }
        }

        const instance = new TestClass();
        expect(instance.doubled).toBe(0);

        instance.count = 5;
        expect(instance.doubled).toBe(10);
    });

    it('should work with multiple dependencies', () => {
        class TestClass {
            @dRef accessor a = 1;
            @dRef accessor b = 2;
            @dRef accessor c = 3;

            @dComputed get sum() {
                return this.a + this.b + this.c;
            }
        }

        const instance = new TestClass();
        expect(instance.sum).toBe(6);

        instance.a = 10;
        expect(instance.sum).toBe(15);
    });

    it('should handle complex computations', () => {
        class TestClass {
            @dRef accessor items = [1, 2, 3, 4, 5];

            @dComputed get sum() {
                return this.items.reduce((acc, item) => acc + item, 0);
            }

            @dComputed get average() {
                return this.sum / this.items.length;
            }
        }

        const instance = new TestClass();
        expect(instance.sum).toBe(15);
        expect(instance.average).toBe(3);

        instance.items.length = 0;
        instance.items.push(10, 20, 30);
        expect(instance.sum).toBe(60);
        expect(instance.average).toBe(20);
    });

    it('should handle multiple instances independently', () => {
        class TestClass {
            @dRef accessor value = 0;

            @dComputed get doubled() {
                return this.value * 2;
            }
        }

        const instance1 = new TestClass();
        const instance2 = new TestClass();

        instance1.value = 5;
        instance2.value = 10;

        expect(instance1.doubled).toBe(10);
        expect(instance2.doubled).toBe(20);
    });

    it('should work with string concatenation', () => {
        class TestClass {
            @dRef accessor prefix = 'Hello';
            @dRef accessor suffix = 'World';

            @dComputed get message() {
                return `${this.prefix}, ${this.suffix}!`;
            }
        }

        const instance = new TestClass();
        expect(instance.message).toBe('Hello, World!');

        instance.prefix = 'Hi';
        expect(instance.message).toBe('Hi, World!');
    });
});
