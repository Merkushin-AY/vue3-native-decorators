# Vue 3 Decorators

This package implements native JS decorators that provide Vue 3 reactivity to class properties. It allows you to use Vue's Composition API features in a more class-oriented way.

## Installation

```bash
npm install vue-decorators
npm install @babel/plugin-proposal-decorators -D
```

If you are using Vite, you will face an issue in dev mode, because Vite doesn't run Babel during development. To make it work in dev mode you need:

```bash
npm install @vitejs/plugin-react -D
```

You don't need to install React itself, just this plugin.
Add it to your `vite.config.ts`:

```ts
export default defineConfig({
    plugins: [
        // just to make decorators work in dev mode
        react({
            babel: {
                configFile: false,
                babelrc: false,
                plugins: [
                    [
                        "@babel/plugin-proposal-decorators",
                        { version: "2023-11" },
                    ],
                ],
            },
        }),
    ],
});
```

Somehow `vite-plugin-babel` doesn't work properly, and Vite has no option to run Babel in dev mode, which is why we need to install `@vitejs/plugin-react`.

## Usage

### dRef
Makes a property accessor `ref`:
```typescript
import { computed } from 'vue';
import { dRef } from 'vue-decorators';

class SomeClass {
    @dRef accessor someProp: number;
}

const instance = new SomeClass();
instance.someProp = 1; // You don't have to use `.someProp.value` to get or set value
console.log(instance.someProp);
const propOneMore = computed(() => instance.someProp + 1); // and this is totally reactive
instance.someProp = 10; // computed will become 11
```

### dShallowRef
Similar to `dRef` but uses `shallowRef` for better performance with large objects:
```typescript
import { dShallowRef } from 'vue-decorators';

class SomeClass {
    @dShallowRef accessor someProp: object;
}
```

### dReactive
Makes a property reactive using Vue's `reactive`:
```typescript
import { dReactive } from 'vue-decorators';

class SomeClass {
    @dReactive someItems = [];
}

const instance = new SomeClass();
instance.someItems.push(1);
console.log(instance.someItems);
```

### dShallowReactive
Similar to `dReactive` but uses `shallowReactive` for better performance. You should use it when the wrapped object contains unmarked decorated instances:
```typescript
import { dShallowReactive } from 'vue-decorators';

class SomeClass {
    @dShallowReactive items: SomeOtherDecoratedClass[] = [];
}
```

### dComputed
Makes a getter computed:
```typescript
import { dRef, dComputed } from 'vue-decorators';

class SomeClass {
    @dRef accessor firstName: string;
    @dRef accessor lastName: string;

    @dComputed get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
}
```

### dEffect
Creates a reactive effect that runs when dependencies change:
```typescript
import { dRef, dEffect, stopWatcher, resumeWatcher, pauseWatcher } from 'vue-decorators';

class SomeClass {
    @dRef accessor count: number;

    @dEffect
    logCount() {
        console.log(`Count changed to: ${this.count}`);
    }

    // or
    @dEffect('sync')
    logCount2() {
        console.log(`Count changed to: ${this.count}`);
    }

    // when you don't need the instance anymore, you have to clean watchers
    destroy() {
        disposeObjectScope(this);
    }
}

const instance = new SomeClass();
// If you want to stop, pause, or resume a specific watcher
pauseWatcher(instance, 'logCount');
resumeWatcher(instance, 'logCount');
stopWatcher(instance, 'logCount');
```

### dWatch
Watches a reactive source and runs a callback when it changes:
```typescript
import { dRef, dWatch, disposeObjectScope } from 'vue-decorators';

class SomeClass {
    @dRef accessor count: number;

    // if you want to use `this` inside getter, you have to use `function` declaration
    @dWatch(function () { return this.count }, { immediate: true })
    onCountChange(newValue: number, oldValue: number) {
        console.log(`Count changed from ${oldValue} to ${newValue}`);
    }

    // when you don't need the instance anymore, you have to clean watchers
    destroy() {
        disposeObjectScope(this);
    }
}

// pause, resume, and stop work the same as for `@dEffect`
```

### dPromise
Wraps an async method with reactive state management:
```typescript
import { computed } from 'vue';
import { dPromise, isPending } from 'vue-decorators';

class SomeClass {
    @dPromise
    async fetchData() {
        const response = await fetch('/api/data');
        return response.json();
    }
}

const instance = new SomeClass();

// Access reactive state
console.log(isPromisePending(instance, 'fetchData'));
console.log(getPromiseResult(instance, 'fetchData'));
console.log(getPromiseError(instance, 'fetchData'));
const result = computed(() => {
    getPromiseResult(instance, 'fetchData');
});

// Or like this, but you will have TypeScript problems
console.log(instance.fetchData.isPending);
console.log(instance.fetchData.result);
console.log(instance.fetchData.error);
```

To fix type issues, you need to create an interface for the class and use a prefix for the method:
```typescript
import { watch } from 'vue';
import { dPromise, DecoratedPromise } from 'vue-decorators';

interface SomeOtherClass {
    fetchData: DecoratedPromise<SomeOtherClass['_$DfetchData']>>
}
class SomeOtherClass {
    @dPromise
    async _$DfetchData() { // prefix will be removed
        const response = await fetch('/api/data');
        return response.json();
    }
}

// works fine:
instance.fetchData();
console.log(instance.fetchData.isPending);
console.log(instance.fetchData.result);
console.log(instance.fetchData.error);
watch(() => instance.fetchData.isPending, (value) => {
    if (value) {
        console.log('Promise is pending');
    }
});
instance.fetchData.abort();
```

## Caveats

1. Deep reactivity.  
Passing a decorated instance into a deep reactive object will cause an error. That's why you need to use shallow API or markRaw instances.
```ts
import { ref, shallowRef, markRaw } from 'vue';
import { dRef, dReactive, dShallowReactive } from 'vue-decorators';

class SomeClass {
    @dRef accessor someProp: number;

    @dReactive children: SomeClass[] = []; // ! will cause errors
    @dShallowReactive children2: SomeClass[] = []; // good

    // OR you can do it like this
    // constructor() {
    //     markRaw(this); 
    // }
}

{
    const instance = new SomeClass();
    const instanceRef = ref(instance); 
    console.log(instanceRef.value.someProp); // ! error
}

{
    const instance = new SomeClass();
    const instanceRef = shallowRef(instance); 
    console.log(instanceRef.value.someProp); // good
}

{
    const instance = new SomeClass();
    markRaw(instance);
    const instanceRef = ref(instance); 
    console.log(instanceRef.value.someProp); // good
}
```

2. Watchers cleaning.  
Same as in Vue, you have to remove watchers if they aren't needed.
```ts
import { onUnmounted } from 'vue';
import { dWatch, disposeObjectScope } from 'vue-decorators';
class SomeClass {
    @dRef accessor count: number;

    // if you want to use `this` inside getter, you have to use `function` declaration
    @dWatch(function (this: SomeClass) { return this.count }, { immediate: true })
    onCountChange(newValue: number, oldValue: number) {
        console.log(`Count changed from ${oldValue} to ${newValue}`);
    }
}

const instance = new SomeClass();

onUnmounted(() => {
    // but I recommend you to implement destroy method in class
    disposeObjectScope(instance); 
});
```


3. Watching decorated properties.  
Use functions in watcher getters:
```ts
class SomeClass {
    @dRef accessor someProp: number;
}
const instance = new SomeClass();

// Won't work
watch(instance.someProp, (v) => {
    console.log(v);
});

// Will work
watch(() => instance.someProp, (v) => {
    console.log(v);
});
```

4. Losing context in event handlers.  

```html
<!-- Won't work if clickHandler uses `this` -->
<button @click="instance.clickHandler">Click</button>
<!-- Will work -->
<button @click="instance.clickHandler()">Click</button>
```

## Features

- Native JS decorators (not supported in browsers yet but work fine with Babel)
- Full TypeScript support
- Easy access to reactive data without `.value` property
- Seamless integration with Vue 3's Composition API
- Support for all major reactivity features (ref, reactive, shallowRef, shallowReactive, computed, watch, effect)
- Decorator that adds reactive state to promise methods

## License
MIT
