import { describe, it, expect } from 'vitest';
import { computed, watch } from 'vue';
import { dShallowReactive } from '../src/index';

describe('dShallowReactive', () => {
  it('should make object shallow reactive', () => {
    class TestClass {
      @dShallowReactive data = { count: 0, name: 'test' };
    }

    const instance = new TestClass();
    expect(instance.data.count).toBe(0);
    expect(instance.data.name).toBe('test');
  });

  it('should allow modifying shallow reactive object properties', () => {
    class TestClass {
      @dShallowReactive data = { count: 0 };
    }

    const instance = new TestClass();
    instance.data.count = 42;
    expect(instance.data.count).toBe(42);
  });

  it('should be reactive with computed', () => {
    class TestClass {
      @dShallowReactive data = { count: 0 };
    }

    const instance = new TestClass();
    const doubled = computed(() => instance.data.count * 2);
    
    expect(doubled.value).toBe(0);
    instance.data.count = 5;
    expect(doubled.value).toBe(10);
  });

  it('should be reactive with watch', async () => {
    class TestClass {
      @dShallowReactive data = { value: 0 };
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
      @dShallowReactive items = [1, 2, 3];
    }

    const instance = new TestClass();
    expect(instance.items).toEqual([1, 2, 3]);
    
    instance.items.push(4);
    expect(instance.items).toEqual([1, 2, 3, 4]);
  });

  it('should handle multiple instances independently', () => {
    class TestClass {
      @dShallowReactive data = { count: 0 };
    }

    const instance1 = new TestClass();
    const instance2 = new TestClass();

    instance1.data.count = 10;
    instance2.data.count = 20;

    expect(instance1.data.count).toBe(10);
    expect(instance2.data.count).toBe(20);
  });

  it('should be reactive to top-level property changes', () => {
    class TestClass {
      @dShallowReactive data = { count: 0, nested: { value: 10 } };
    }

    const instance = new TestClass();
    const computedValue = computed(() => instance.data.count);
    
    expect(computedValue.value).toBe(0);
    
    instance.data.count = 5;
    expect(computedValue.value).toBe(5);
  });

  it('should NOT be reactive to nested object changes', async () => {
    class TestClass {
      @dShallowReactive data = { 
        count: 0, 
        nested: { 
          value: 10,
          deep: { theme: 'dark' }
        } 
      };
    }

    const instance = new TestClass();
    let watchTriggered = false;
    
    watch(
      () => instance.data.nested.value,
      () => {
        watchTriggered = true;
      },
    );

    // Change nested property - should NOT trigger watch
    instance.data.nested.value = 42;
    
    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(watchTriggered).toBe(false);
    
    // Change top-level property - should trigger watch
    instance.data.count = 100;
    await new Promise(resolve => setTimeout(resolve, 0));
    // This should not trigger the watch since we're watching nested.value
    expect(watchTriggered).toBe(false);
  });

  it('should be reactive to array mutations at top level', () => {
    class TestClass {
      @dShallowReactive items = [{ id: 1, nested: { value: 10 } }];
    }

    const instance = new TestClass();
    const computedLength = computed(() => instance.items.length);
    
    expect(computedLength.value).toBe(1);
    
    instance.items.push({ id: 2, nested: { value: 20 } });
    expect(computedLength.value).toBe(2);
  });

  it('should NOT be reactive to nested object mutations in arrays', async () => {
    class TestClass {
      @dShallowReactive items = [{ id: 1, nested: { value: 10 } }];
    }

    const instance = new TestClass();
    let watchTriggered = false;
    
    watch(
      () => instance.items[0].nested.value,
      () => {
        watchTriggered = true;
      },
    );

    // Change nested property in array item - should NOT trigger watch
    instance.items[0].nested.value = 42;
    
    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(watchTriggered).toBe(false);
  });
});
