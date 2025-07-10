import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dRef, dWatch, disposeObjectScope, stopWatcher, pauseWatcher, resumeWatcher } from '../src/index';

describe('dWatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should create a watcher that runs when source changes', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        class TestClass {
            @dRef accessor count = 0;

            @dWatch(
                function () {
                    return this.count;
                },
                { immediate: true },
            )
            onCountChange(newValue: number, oldValue: number) {
                console.log(`Count changed from ${oldValue} to ${newValue}`);
            }
        }

        const instance = new TestClass();
        
        // Should run immediately
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(consoleSpy).toHaveBeenCalledWith('Count changed from undefined to 0');
        
        instance.count = 5;
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(consoleSpy).toHaveBeenCalledWith('Count changed from 0 to 5');

        disposeObjectScope(instance);
        consoleSpy.mockRestore();
    });

    it('should work with multiple watchers', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        class TestClass {
            @dRef accessor count = 0;
            @dRef accessor name = 'John';

            @dWatch(function () {
                return this.count;
            })
            onCountChange(newValue: number, oldValue: number) {
                console.log(`Count: ${oldValue} -> ${newValue}`);
            }

            @dWatch(function () {
                return this.name;
            })
            onNameChange(newValue: string, oldValue: string) {
                console.log(`Name: ${oldValue} -> ${newValue}`);
            }
        }

        const instance = new TestClass();
        await new Promise(resolve => setTimeout(resolve, 0));

        instance.count = 5;
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(consoleSpy).toHaveBeenCalledWith('Count: 0 -> 5');
        
        instance.name = 'Jane';
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(consoleSpy).toHaveBeenCalledWith('Name: John -> Jane');

        disposeObjectScope(instance);
        consoleSpy.mockRestore();
    });

    it('dWatch should handle multiple instances independently', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        class TestClass {
            v = Math.random();
            @dRef accessor count = 0;

            @dWatch(function () {
                return this.count;
            })
            onCountChange(newValue: number, oldValue: number) {
                console.log(`Instance count: ${oldValue} -> ${newValue}`);
            }
        }

        const instance1 = new TestClass();
        const instance2 = new TestClass();
        await new Promise(resolve => setTimeout(resolve, 0));

        instance1.count = 5;
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(consoleSpy).toHaveBeenCalledWith('Instance count: 0 -> 5');
        
        instance2.count = 10;
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(consoleSpy).toHaveBeenCalledWith('Instance count: 0 -> 10');

        disposeObjectScope(instance1);
        disposeObjectScope(instance2);
        consoleSpy.mockRestore();
    });

    it('should support watcher control functions', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        class TestClass {
            @dRef accessor count = 0;

            @dWatch(function () {
                return this.count;
            })
            onCountChange(newValue: number, oldValue: number) {
                console.log(`Count: ${oldValue} -> ${newValue}`);
            }
        }

        const instance = new TestClass();
        
        // Pause the watcher
        pauseWatcher(instance, 'onCountChange');
        instance.count = 5;
        await new Promise(resolve => setTimeout(resolve, 0));
        // Should not log because watcher is paused
        
        // Resume the watcher
        resumeWatcher(instance, 'onCountChange');
        instance.count = 10;
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(consoleSpy).toHaveBeenCalledWith('Count: 5 -> 10');
        
        // Stop the watcher
        stopWatcher(instance, 'onCountChange');
        instance.count = 20;
        await new Promise(resolve => setTimeout(resolve, 0));
        // Should not log because watcher is stopped

        disposeObjectScope(instance);
        consoleSpy.mockRestore();
    });

    it('should work with watch options', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        class TestClass {
            @dRef accessor count = 0;

            @dWatch(
                function () {
                    return this.count;
                },
                { deep: true },
            )
            onCountChange(newValue: number, oldValue: number) {
                console.log(`Count changed: ${oldValue} -> ${newValue}`);
            }
        }

        const instance = new TestClass();
        await new Promise(resolve => setTimeout(resolve, 0));

        instance.count = 5;
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(consoleSpy).toHaveBeenCalledWith('Count changed: 0 -> 5');

        disposeObjectScope(instance);
        consoleSpy.mockRestore();
    });
});
