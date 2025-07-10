import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computed, watch } from 'vue';
import { 
  dRef, 
  dShallowRef, 
  dReactive, 
  dShallowReactive, 
  dComputed, 
  dEffect, 
  dWatch, 
  dPromise,
  disposeObjectScope,
} from '../src/index';

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should work with multiple decorators on the same class', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    class UserProfile {
      @dRef accessor firstName = 'John';
      @dRef accessor lastName = 'Doe';
      @dReactive profile = { age: 30, city: 'New York' };
      @dShallowReactive preferences = { theme: 'dark', notifications: true };

      @dComputed get fullName() {
        return `${this.firstName} ${this.lastName}`;
      }

      @dComputed get displayName() {
        return `${this.fullName} (${this.profile.age})`;
      }

      @dEffect
      logProfileChange() {
        console.log(`Profile updated: ${this.displayName}`);
      }

      @dWatch(function () {
        return this.profile.age;
      })
      onAgeChange(newAge: number, oldAge: number) {
        console.log(`Age changed from ${oldAge} to ${newAge}`);
      }
    }

    const user = new UserProfile();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(user.fullName).toBe('John Doe');
    expect(user.displayName).toBe('John Doe (30)');
    
    user.firstName = 'Jane';
    expect(user.fullName).toBe('Jane Doe');
    expect(user.displayName).toBe('Jane Doe (30)');
    
    user.profile.age = 31;
    expect(user.displayName).toBe('Jane Doe (31)');

   
    expect(consoleSpy).toHaveBeenCalledWith('Age changed from 30 to 31');

    disposeObjectScope(user);
    consoleSpy.mockRestore();
  });

  it('should handle reactive arrays and objects', () => {
    class TodoList {
      @dReactive todos = [
        { id: 1, text: 'Learn Vue', completed: false },
        { id: 2, text: 'Learn Decorators', completed: false },
      ];
      
      @dShallowReactive categories = [
        { id: 1, name: 'Work' },
        { id: 2, name: 'Personal' },
      ];

      @dComputed get completedTodos() {
        return this.todos.filter((todo) => todo.completed);
      }

      @dComputed get pendingTodos() {
        return this.todos.filter((todo) => !todo.completed);
      }

      @dEffect
      logTodoChanges() {
        console.log(`Completed: ${this.completedTodos.length}, Pending: ${this.pendingTodos.length}`);
      }
    }

    const todoList = new TodoList();
    
    expect(todoList.completedTodos.length).toBe(0);
    expect(todoList.pendingTodos.length).toBe(2);
    
    todoList.todos[0].completed = true;
    expect(todoList.completedTodos.length).toBe(1);
    expect(todoList.pendingTodos.length).toBe(1);

    disposeObjectScope(todoList);
  });

  it('should work with async operations and reactive state', async () => {
    interface User {
      id: number;
      name: string;
    }

    class DataService {
      @dRef accessor loading = false;
      @dReactive data: { users: User[]; posts: any[] } = { users: [], posts: [] };
      @dShallowReactive filters = { search: '', category: 'all' };

      @dComputed get filteredUsers() {
        if (!this.filters.search) return this.data.users;
        return this.data.users.filter((user) =>
          user.name.toLowerCase().includes(this.filters.search.toLowerCase()),
        );
      }

      @dPromise
      async fetchUsers() {
        this.loading = true;
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.data.users = [
          { id: 1, name: 'John Doe' },
          { id: 2, name: 'Jane Smith' },
        ];
        this.loading = false;
        return this.data.users;
      }

      @dEffect
      logDataChanges() {
        console.log(`Users: ${this.data.users.length}, Loading: ${this.loading}`);
      }
    }

    const service = new DataService();
    
    expect(service.loading).toBe(false);
    expect(service.data.users.length).toBe(0);
    
    const users = await service.fetchUsers();
    expect(users).toHaveLength(2);
    expect(service.loading).toBe(false);
    expect(service.data.users.length).toBe(2);
    
    service.filters.search = 'john';
    expect(service.filteredUsers).toHaveLength(1);

    disposeObjectScope(service);
  });

  it('should handle complex reactive chains', () => {
    class ShoppingCart {
      @dReactive items = [
        { id: 1, name: 'Product 1', price: 10, quantity: 2 },
        { id: 2, name: 'Product 2', price: 20, quantity: 1 },
      ];
      
      @dRef accessor taxRate = 0.1;
      @dRef accessor discount = 0;

      @dComputed get subtotal() {
        return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      }

      @dComputed get tax() {
        return this.subtotal * this.taxRate;
      }

      @dComputed get discountAmount() {
        return this.subtotal * this.discount;
      }

      @dComputed get total() {
        return this.subtotal + this.tax - this.discountAmount;
      }

      @dEffect
      logTotalChange() {
        console.log(`Total: $${this.total.toFixed(2)}`);
      }
    }

    const cart = new ShoppingCart();
    
    expect(cart.subtotal).toBe(40); // (10 * 2) + (20 * 1)
    expect(cart.tax).toBe(4); // 40 * 0.1
    expect(cart.total).toBe(44); // 40 + 4 - 0
    
    cart.taxRate = 0.15;
    expect(cart.tax).toBe(6); // 40 * 0.15
    expect(cart.total).toBe(46); // 40 + 6 - 0
    
    cart.discount = 0.1; // 10% discount
    expect(cart.discountAmount).toBe(4); // 40 * 0.1
    expect(cart.total).toBe(42); // 40 + 6 - 4

    disposeObjectScope(cart);
  });
});
