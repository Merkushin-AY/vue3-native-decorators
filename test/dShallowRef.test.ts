import { describe, it, expect } from 'vitest';
import { computed, watch } from 'vue';
import { dShallowRef } from '../src/index';

describe('dShallowRef', () => {
  it('should create a shallowRef for accessor property', () => {
    class TestClass {
      @dShallowRef accessor value = { nested: { data: 42 } };
    }

    const instance = new TestClass();
    expect(instance.value).toEqual({ nested: { data: 42 } });
  });

  it('should allow setting and getting values', () => {
    class TestClass {
      @dShallowRef accessor value = { count: 0 };
    }

    const instance = new TestClass();
    instance.value = { count: 100 };
    expect(instance.value).toEqual({ count: 100 });
  });

  it('should be reactive with computed', () => {
    class TestClass {
      @dShallowRef accessor data = { count: 0 };
    }

    const instance = new TestClass();
    const doubled = computed(() => instance.data.count * 2);
    
    expect(doubled.value).toBe(0);
    instance.data = { count: 5 };
    expect(doubled.value).toBe(10);
  });

  it('should be reactive with watch', async () => {
    class TestClass {
      @dShallowRef accessor data = { value: 0 };
    }

    const instance = new TestClass();
    let watchedValue = 0;
    
    watch(
      () => instance.data.value,
      (newValue) => {
        watchedValue = newValue;
      },
    );

    instance.data = { value: 42 };
    
    // Wait for next tick to allow watch to execute
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(watchedValue).toBe(42);
  });

  it('should work with arrays', () => {
    class TestClass {
      @dShallowRef accessor items = [1, 2, 3];
    }

    const instance = new TestClass();
    expect(instance.items).toEqual([1, 2, 3]);
    
    instance.items = [4, 5, 6];
    expect(instance.items).toEqual([4, 5, 6]);
  });

  it('should handle multiple instances independently', () => {
    class TestClass {
      @dShallowRef accessor data = { value: 0 };
    }

    const instance1 = new TestClass();
    const instance2 = new TestClass();

    instance1.data = { value: 10 };
    instance2.data = { value: 20 };

    expect(instance1.data.value).toBe(10);
    expect(instance2.data.value).toBe(20);
  });

  it('should NOT be reactive to nested object changes', async () => {
    class TestClass {
      @dShallowRef accessor data = { nested: { count: 0 } };
    }

    const instance = new TestClass();
    let watchTriggered = false;
    
    watch(
      () => instance.data.nested.count,
      () => {
        watchTriggered = true;
      },
    );

    // Change nested property - should NOT trigger watch
    instance.data.nested.count = 42;
    
    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(watchTriggered).toBe(false);
    
    // Change the entire object - should trigger watch
    instance.data = { nested: { count: 100 } };
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(watchTriggered).toBe(true);
  });

  it('should be reactive to top-level property changes', () => {
    class TestClass {
      @dShallowRef accessor data = { count: 0, name: 'test' };
    }

    const instance = new TestClass();
    const computedValue = computed(() => instance.data.count);
    
    expect(computedValue.value).toBe(0);
    
    // Change entire object - should be reactive
    instance.data = { count: 5, name: 'test' };
    expect(computedValue.value).toBe(5);
  });
});
