# @kuindji/event-bus

A powerful, type-safe JavaScript/TypeScript event bus library with advanced features including event aggregation, action handling, and inter-bus communication.

[![npm version](https://badge.fury.io/js/@kuindji%2Fevent-bus.svg)](https://badge.fury.io/js/@kuindji%2Fevent-bus)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

- 🎯 **Type-safe events** with full TypeScript support
- 🔄 **Multiple return strategies** (first, last, all, merge, concat, pipe, etc.)
- 🏷️ **Tag-based filtering** for selective event handling
- ⚡ **Async support** with Promise resolution
- 🔗 **Event source integration** for inter-bus communication
- 🎭 **Action bus** for request-response patterns
- 🎛️ **Advanced listener options** (limits, priorities, contexts)
- 🚫 **Interception and filtering** capabilities
- 🔄 **Event relay** between different event buses

## Installation

```bash
npm install @kuindji/event-bus
```

## Quick Start

### Basic Event Bus

```typescript
import { createEventBus } from "@kuindji/event-bus";

// Create a typed event bus
const bus = createEventBus<{
    userLogin: (userId: string, timestamp: Date) => void;
    userLogout: (userId: string) => void;
    dataUpdate: (data: any) => void;
}>();

// Subscribe to events
bus.on("userLogin", (userId, timestamp) => {
    console.log(`User ${userId} logged in at ${timestamp}`);
});

// Trigger events
bus.trigger("userLogin", "user123", new Date());
```

### Advanced Event Handling

```typescript
// Multiple return strategies
const results = bus.all("dataUpdate", { id: 1, value: "test" });
// Returns array of all listener results

const firstResult = bus.first("dataUpdate", { id: 1, value: "test" });
// Returns first non-undefined result

const mergedResult = bus.merge("dataUpdate", { id: 1, value: "test" });
// Merges all results into a single object

// Tag-based filtering
bus.on("dataUpdate", (data) => {
    console.log("Handler 1:", data);
}, { tags: [ "logger" ] });

bus.on("dataUpdate", (data) => {
    console.log("Handler 2:", data);
}, { tags: [ "validator" ] });

// Only trigger handlers with specific tags
bus.withTags([ "logger" ], () => {
    bus.trigger("dataUpdate", { id: 1 });
});
```

## Core Concepts

### Event Bus

The main event bus provides a centralized way to handle events with type safety and advanced features.

```typescript
const bus = createEventBus<{
    // Define your event signatures here
    message: (text: string, priority: "low" | "high") => void;
    error: (error: Error) => void;
}>();
```

### Return Strategies

The library supports multiple strategies for handling listener return values:

- **`trigger()`** - Fire and forget (no return value)
- **`first()`** - Return first non-undefined result
- **`last()`** - Return last non-undefined result
- **`all()`** - Return array of all results
- **`merge()`** - Merge all results into single object
- **`concat()`** - Concatenate all results
- **`pipe()`** - Pass result from one listener to the next
- **`untilTrue()`** - Stop when a listener returns true
- **`untilFalse()`** - Stop when a listener returns false
- **`firstNonEmpty()`** - Return first non-empty result

```typescript
// Example with different strategies
const bus = createEventBus<{
    processData: (data: number[]) => number[];
}>();

bus.on("processData", (data) => data.map(x => x * 2));
bus.on("processData", (data) => data.filter(x => x > 10));

// Get all results
const allResults = bus.all("processData", [ 1, 2, 3, 4, 5 ]);
// Returns: [[2, 4, 6, 8, 10], [12, 14, 16, 18, 20]]

// Get first result
const firstResult = bus.first("processData", [ 1, 2, 3, 4, 5 ]);
// Returns: [2, 4, 6, 8, 10]

// Pipe results through listeners
const pipedResult = bus.pipe("processData", [ 1, 2, 3, 4, 5 ]);
// Returns: [12, 14, 16, 18, 20] (result of second listener)
```

### Listener Options

Advanced configuration for event listeners:

```typescript
bus.on("event", handler, {
    limit: 5, // Call handler only 5 times
    first: true, // Add to beginning of listener list
    alwaysFirst: true, // Always run before other listeners
    alwaysLast: true, // Always run after other listeners
    start: 3, // Start calling after 3rd trigger
    context: this, // Set 'this' context
    tags: [ "debug" ], // Add tags for filtering
    async: true, // Call asynchronously
    extraData: {}, // Custom data
});
```

### Action Bus

For request-response patterns with error handling:

```typescript
import { createActionBus } from "@kuindji/event-bus";

const actionBus = createActionBus<{
    fetchUser: (id: string) => Promise<User>;
    validateData: (data: any) => boolean;
}>();

// Define actions
actionBus.add("fetchUser", async (id) => {
    const user = await api.getUser(id);
    return user;
});

actionBus.add("validateData", (data) => {
    return data && typeof data.id === "string";
});

// Invoke actions
const result = await actionBus.invoke("fetchUser", "user123");
// Returns: { response: User, error: null, request: ['user123'] }

// Listen to action results
actionBus.on("fetchUser", ({ response, error, request }) => {
    if (error) {
        console.error("Failed to fetch user:", error);
    }
    else {
        console.log("User fetched:", response);
    }
});

// Listen to errors globally
actionBus.onError(({ name, error, request }) => {
    console.error(`Action ${name} failed:`, error);
});
```

### Event Sources

Connect multiple event buses together:

```typescript
const mainBus = createEventBus<{ mainEvent: (data: any) => void; }>();
const childBus = createEventBus<{ childEvent: (data: any) => void; }>();

// Add child bus as event source
mainBus.addEventSource({
    name: "child",
    on: childBus.on.bind(childBus),
    un: childBus.un.bind(childBus),
    accepts: (name) => name === "childEvent",
    proxyType: ProxyType.TRIGGER,
});

// Now triggering on child bus will also trigger on main bus
childBus.trigger("childEvent", { data: "test" });
// This will also trigger any listeners on mainBus for 'childEvent'
```

### Event Relay

Relay events between different event sources:

```typescript
const bus1 = createEventBus();
const bus2 = createEventBus();

// Relay all events from bus1 to bus2
bus1.relay({
    eventSource: bus2,
    remoteEventName: "*",
    localEventNamePrefix: "relayed_",
});

// Now when bus1 triggers 'userLogin', bus2 will trigger 'relayed_userLogin'
```

## API Reference

### Event Bus Methods

#### Core Methods

- `on(eventName, handler, options?)` - Subscribe to an event
- `once(eventName, handler, options?)` - Subscribe to an event once
- `un(eventName, handler, context?, tag?)` - Unsubscribe from an event
- `trigger(eventName, ...args)` - Trigger an event
- `emit(eventName, ...args)` - Alias for trigger

#### Return Strategy Methods

- `first(eventName, ...args)` - Return first result
- `last(eventName, ...args)` - Return last result
- `all(eventName, ...args)` - Return all results
- `merge(eventName, ...args)` - Merge all results
- `concat(eventName, ...args)` - Concatenate all results
- `pipe(eventName, ...args)` - Pipe results through listeners
- `untilTrue(eventName, ...args)` - Stop on first true
- `untilFalse(eventName, ...args)` - Stop on first false
- `firstNonEmpty(eventName, ...args)` - Return first non-empty result

#### Async Return Strategy Methods

- `resolveFirst(eventName, ...args)` - Async first result
- `resolveLast(eventName, ...args)` - Async last result
- `resolveAll(eventName, ...args)` - Async all results
- `resolveMerge(eventName, ...args)` - Async merge results
- `resolveConcat(eventName, ...args)` - Async concat results
- `resolvePipe(eventName, ...args)` - Async pipe results
- `resolveFirstNonEmpty(eventName, ...args)` - Async first non-empty result

#### Control Methods

- `withTags(tags, callback)` - Execute callback with tag filter
- `intercept(interceptor)` - Add event interceptor
- `stopIntercepting()` - Remove event interceptor
- `reset()` - Reset the event bus
- `suspendAll(withQueue?)` - Suspend all events
- `resumeAll()` - Resume all events

#### Event Source Methods

- `addEventSource(eventSource)` - Add event source
- `removeEventSource(eventSource)` - Remove event source
- `relay(options)` - Relay events to another source
- `unrelay(options)` - Stop relaying events

### Action Bus Methods

- `add(name, action)` - Add an action
- `invoke(name, ...args)` - Invoke an action
- `on(name, handler, options?)` - Listen to action results
- `once(name, handler, options?)` - Listen to action results once
- `un(name, handler, context?, tag?)` - Remove action listener
- `onError(handler, options?)` - Listen to all action errors
- `get(name)` - Get action instance

## Advanced Examples

### Middleware Pattern

```typescript
const bus = createEventBus<{
    request: (data: any) => any;
    response: (data: any) => void;
}>();

// Add middleware
bus.intercept((name, args, tags, returnType) => {
    if (name === "request") {
        console.log("Request intercepted:", args);
        // Return false to prevent event from triggering
        return true;
    }
    return true;
});

// Add logging middleware
bus.on("*", (name, args, tags) => {
    console.log(`Event ${name} triggered with:`, args);
});
```

### Priority-based Processing

```typescript
const bus = createEventBus<{
    processOrder: (order: Order) => Order;
}>();

// High priority validation
bus.on("processOrder", (order) => {
    if (!order.items || order.items.length === 0) {
        throw new Error("Order must have items");
    }
    return order;
}, { alwaysFirst: true, tags: [ "validation" ] });

// Business logic
bus.on("processOrder", (order) => {
    order.total = order.items.reduce((sum, item) => sum + item.price, 0);
    return order;
}, { tags: [ "business" ] });

// Logging
bus.on("processOrder", (order) => {
    console.log("Order processed:", order);
    return order;
}, { alwaysLast: true, tags: [ "logging" ] });
```

### Event-driven Architecture

```typescript
// User service
const userBus = createEventBus<{
    userCreated: (user: User) => void;
    userUpdated: (user: User) => void;
    userDeleted: (userId: string) => void;
}>();

// Notification service
const notificationBus = createEventBus<{
    sendEmail: (to: string, subject: string, body: string) => void;
    sendSMS: (to: string, message: string) => void;
}>();

// Connect services
userBus.addEventSource({
    name: "notifications",
    on: notificationBus.on.bind(notificationBus),
    un: notificationBus.un.bind(notificationBus),
    accepts: (name) => [ "sendEmail", "sendSMS" ].includes(name as string),
    proxyType: ProxyType.TRIGGER,
});

// Handle user events
userBus.on("userCreated", (user) => {
    // This will also trigger notificationBus.sendEmail
    notificationBus.trigger(
        "sendEmail",
        user.email,
        "Welcome!",
        "Welcome to our platform",
    );
});
```

## TypeScript Support

The library provides full TypeScript support with advanced type inference:

```typescript
// Define event types
type AppEvents = {
    userLogin: (userId: string, timestamp: Date) => void;
    dataUpdate: (data: any) => number;
    error: (error: Error) => boolean;
};

// Create typed event bus
const bus = createEventBus<AppEvents>();

// TypeScript will enforce correct parameter types
bus.on("userLogin", (userId, timestamp) => {
    // userId is typed as string
    // timestamp is typed as Date
});

// TypeScript will enforce correct return types
const result = bus.first("dataUpdate", { id: 1 });
// result is typed as number | undefined
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Author

Ivan Kuindzhi - [@kuindji](https://github.com/kuindji)
