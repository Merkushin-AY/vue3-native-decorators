import { describe, it, expect, vi } from 'vitest';
import { makeObjectScope, disposeObjectScope } from '../src/index';

describe('Scope Management', () => {
    it('should create object scope', () => {
        const obj = {};
        const scope = makeObjectScope(obj);

        expect(scope).toBeDefined();
        expect(typeof scope.run).toBe('function');
        expect(typeof scope.stop).toBe('function');
    });

    it('should return the same scope for the same object', () => {
        const obj = {};
        const scope1 = makeObjectScope(obj);
        const scope2 = makeObjectScope(obj);

        expect(scope1).toBe(scope2);
    });

    it('should create different scopes for different objects', () => {
        const obj1 = {};
        const obj2 = {};
        const scope1 = makeObjectScope(obj1);
        const scope2 = makeObjectScope(obj2);

        expect(scope1).not.toBe(scope2);
    });

    it('should dispose object scope', () => {
        const obj = {};
        const scope = makeObjectScope(obj);

        // Mock the stop method
        const stopSpy = vi.spyOn(scope, 'stop');

        disposeObjectScope(obj);

        expect(stopSpy).toHaveBeenCalled();

        // Should not have scope after disposal
        const newScope = makeObjectScope(obj);
        expect(newScope).not.toBe(scope);
    });

    it('should handle disposal of non-existent scope', () => {
        const obj = {};

        // Should not throw when disposing non-existent scope
        expect(() => disposeObjectScope(obj)).not.toThrow();
    });

    it('should work with class instances', () => {
        class TestClass {
            scope: any;

            constructor() {
                this.scope = makeObjectScope(this);
            }
        }

        const instance = new TestClass();
        const scope = makeObjectScope(instance);

        expect(scope).toBe(instance.scope);

        disposeObjectScope(instance);

        const newScope = makeObjectScope(instance);
        expect(newScope).not.toBe(instance.scope);
    });
});
