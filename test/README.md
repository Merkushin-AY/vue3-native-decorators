# Test Suite for Vue 3 Native Decorators

This directory contains comprehensive unit tests for all exported methods in the vue3-native-decorators library.

## Test Structure

### Individual Decorator Tests

- **dRef.test.ts** - Tests for the `@dRef` decorator that creates reactive refs
- **dShallowRef.test.ts** - Tests for the `@dShallowRef` decorator for shallow refs
- **dReactive.test.ts** - Tests for the `@dReactive` decorator for reactive objects
- **dShallowReactive.test.ts** - Tests for the `@dShallowReactive` decorator for shallow reactive objects
- **dComputed.test.ts** - Tests for the `@dComputed` decorator for computed properties
- **dEffect.test.ts** - Tests for the `@dEffect` decorator for reactive effects
- **dWatch.test.ts** - Tests for the `@dWatch` decorator for watchers
- **dPromise.test.ts** - Tests for the `@dPromise` decorator and related promise utilities

### Utility Tests

- **scope.test.ts** - Tests for scope management functions (`makeObjectScope`, `disposeObjectScope`)

### Integration Tests

- **integration.test.ts** - Tests that combine multiple decorators to ensure they work together properly

## Test Coverage

The test suite covers:

1. **Basic Functionality** - Each decorator works as expected
2. **Reactivity** - Changes to decorated properties trigger reactive updates
3. **Multiple Instances** - Decorators work correctly with multiple class instances
4. **Error Handling** - Proper error handling for edge cases
5. **Integration** - Multiple decorators working together
6. **Async Operations** - Promise decorators and async functionality
7. **Scope Management** - Proper cleanup and disposal of reactive scopes

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Dependencies

- **Vitest** - Testing framework
- **Vue 3** - For reactivity testing
- **TypeScript** - For type checking

## Notes

- Tests use real Vue 3 reactivity (not mocked) to ensure actual functionality
- Console logging is mocked where appropriate to avoid test output noise
- Each test properly cleans up reactive scopes to prevent memory leaks
- TypeScript errors are handled to ensure type safety in tests
