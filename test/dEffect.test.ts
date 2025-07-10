import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dRef, dEffect, disposeObjectScope, stopWatcher, pauseWatcher, resumeWatcher } from '../src/index';

describe('dEffect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an effect that runs when dependencies change', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    class TestClass {
      @dRef accessor count = 0;

      @dEffect
      logCount() {
        console.log(`Count changed to: ${this.count}`);
      }
    }

    const instance = new TestClass();
    
    // Effect should run initially
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Count changed to: 0');
    
    instance.count = 5;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Count changed to: 5');

    disposeObjectScope(instance);
    consoleSpy.mockRestore();
  });

  it('should work with flush option', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    class TestClass {
      @dRef accessor count = 0;

      @dEffect('sync')
      logCount() {
        console.log(`Count changed to: ${this.count}`);
      }
    }

    const instance = new TestClass();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Count changed to: 0');
    
    instance.count = 10;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Count changed to: 10');

    disposeObjectScope(instance);
    consoleSpy.mockRestore();
  });

  it('should handle multiple effects', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    class TestClass {
      @dRef accessor count = 0;
      @dRef accessor name = 'John';

      @dEffect
      logCount() {
        console.log(`Count: ${this.count}`);
      }

      @dEffect
      logName() {
        console.log(`Name: ${this.name}`);
      }
    }

    const instance = new TestClass();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Count: 0');
    expect(consoleSpy).toHaveBeenCalledWith('Name: John');
    
    instance.count = 5;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Count: 5');

    disposeObjectScope(instance);
    consoleSpy.mockRestore();
  });

  it('should handle multiple instances independently', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    class TestClass {
      @dRef accessor count = 0;

      @dEffect
      logCount() {
        console.log(`Instance count: ${this.count}`);
      }
    }

    const instance1 = new TestClass();
    const instance2 = new TestClass();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Instance count: 0');
    expect(consoleSpy).toHaveBeenCalledWith('Instance count: 0');
    
    instance1.count = 5;
    instance2.count = 10;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Instance count: 5');
    expect(consoleSpy).toHaveBeenCalledWith('Instance count: 10');

    disposeObjectScope(instance1);
    disposeObjectScope(instance2);
    consoleSpy.mockRestore();
  });

  it('should support watcher control functions', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    class TestClass {
      @dRef accessor count = 0;

      @dEffect
      logCount() {
        console.log(`Count: ${this.count}`);
      }
    }

    const instance = new TestClass();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Count: 0');
    
    // Pause the watcher
    pauseWatcher(instance, 'logCount');
    instance.count = 5;
    await new Promise(resolve => setTimeout(resolve, 0));
    // Should not log because watcher is paused
    
    // Resume the watcher
    resumeWatcher(instance, 'logCount');
    instance.count = 10;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Count: 10');
    
    // Stop the watcher
    stopWatcher(instance, 'logCount');
    instance.count = 20;
    await new Promise(resolve => setTimeout(resolve, 0));
    // Should not log because watcher is stopped

    disposeObjectScope(instance);
    consoleSpy.mockRestore();
  });
});
