import { describe, it, expect } from 'vitest';
import { computed, watch } from 'vue';
import { dReactive } from '../src/index';

describe('dReactive', () => {
  it('should make object reactive', () => {
    class TestClass {
      @dReactive data = { count: 0, name: 'test' };
    }

    const instance = new TestClass();
    expect(instance.data.count).toBe(0);
    expect(instance.data.name).toBe('test');
  });

  it('should allow modifying reactive object properties', () => {
    class TestClass {
      @dReactive data = { count: 0 };
    }

    const instance = new TestClass();
    instance.data.count = 42;
    expect(instance.data.count).toBe(42);
  });

  it('should be reactive with computed', () => {
    class TestClass {
      @dReactive data = { count: 0 };
    }

    const instance = new TestClass();
    const doubled = computed(() => instance.data.count * 2);
    
    expect(doubled.value).toBe(0);
    instance.data.count = 5;
    expect(doubled.value).toBe(10);
  });

  it('should be reactive with watch', async () => {
    class TestClass {
      @dReactive data = { value: 0 };
    }

    const instance = new TestClass();
    let watchedValue = 0;
    
    watch(
      () => instance.data.value,
      (newValue) => {
        watchedValue = newValue;
      },
    );

    instance.data.value = 42;
    
    // Wait for next tick to allow watch to execute
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(watchedValue).toBe(42);
  });

  it('should work with arrays', () => {
    class TestClass {
      @dReactive items = [1, 2, 3];
    }

    const instance = new TestClass();
    expect(instance.items).toEqual([1, 2, 3]);
    
    instance.items.push(4);
    expect(instance.items).toEqual([1, 2, 3, 4]);
  });

  it('should handle nested object modifications', () => {
    class TestClass {
      @dReactive data = { user: { name: 'John', age: 30 } };
    }

    const instance = new TestClass();
    instance.data.user.age = 31;
    expect(instance.data.user.age).toBe(31);
  });

  it('should handle multiple instances independently', () => {
    class TestClass {
      @dReactive data = { count: 0 };
    }

    const instance1 = new TestClass();
    const instance2 = new TestClass();

    instance1.data.count = 10;
    instance2.data.count = 20;

    expect(instance1.data.count).toBe(10);
    expect(instance2.data.count).toBe(20);
  });

  it('should be reactive to deep nested changes', async () => {
    class TestClass {
      @dReactive data = { 
        user: { 
          profile: { 
            settings: { theme: 'dark' } 
          } 
        } 
      };
    }

    const instance = new TestClass();
    let watchTriggered = false;
    
    watch(
      () => instance.data.user.profile.settings.theme,
      () => {
        watchTriggered = true;
      },
    );

    // Change deeply nested property - should trigger watch
    instance.data.user.profile.settings.theme = 'light';
    
    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(watchTriggered).toBe(true);
  });

  it('should be reactive to array mutations', () => {
    class TestClass {
      @dReactive items = [{ id: 1, name: 'item1' }];
    }

    const instance = new TestClass();
    const computedLength = computed(() => instance.items.length);
    
    expect(computedLength.value).toBe(1);
    
    instance.items.push({ id: 2, name: 'item2' });
    expect(computedLength.value).toBe(2);
    
    instance.items[0].name = 'updated';
    expect(instance.items[0].name).toBe('updated');
  });
});
