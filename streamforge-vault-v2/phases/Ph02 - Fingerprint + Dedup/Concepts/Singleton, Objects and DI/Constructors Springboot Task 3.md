---
tags:
  - code
  - task3
  - ph02
  - java
phase:
date: 2026-05-07
---
[[Stateless vs Stateful in StreamForge]]
[[Component reference table]]

# `ClassName` / `methodName`

## 💡 What It Is

We implemented DeduplicationEngine class and its constructor.
Beautiful explanation here: https://claude.ai/share/506015a7-0814-4f08-b47d-3247fa03788a
## 📝 How It Works


Stateless and Stateful in our app:
```java
// src/main/java/com/streamforge/engine/DeduplicationEngine.java


@Slf4j
@Component
public class DeduplicationEngine {

    private final ConcurrentHashMap<String, DeduplicationEntry> cache = new ConcurrentHashMap<>();
    private final FingerprintGenerator fingerprintGenerator;
    private final Duration ttl;

    public DeduplicationEngine(
            FingerprintGenerator fingerprintGenerator,
            // WHY @Value? Makes TTL configurable per environment.
            // Dev might use 5 min, prod uses 30 min — no code change needed.
            @Value("${streamforge.dedup.ttl-minutes:30}") int ttlMinutes
    ) {
        this.fingerprintGenerator = fingerprintGenerator;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }
    }
```

```
this.fingerprintGenerator = fingerprintGenerator;
```

It's assigning the `FingerprintGenerator` that Spring injected into the constructor to the class field so you can use it later in other methods.

Two things happening here — the parameter and the field have the same name, so `this` distinguishes them:

```java
private final FingerprintGenerator fingerprintGenerator; // class field

public DeduplicationEngine(FingerprintGenerator fingerprintGenerator ...) { // constructor parameter
    this.fingerprintGenerator = fingerprintGenerator; // field = parameter
}
```

Without `this`:

```java
fingerprintGenerator = fingerprintGenerator; // assigning to itself — does nothing
```

With `this`:

```java
this.fingerprintGenerator = fingerprintGenerator; // class field = constructor parameter ✅
```

---

**Why does Spring inject it?** Because `FingerprintGenerator` is a `@Component` and `DeduplicationEngine` is a `@Component`. Spring sees the constructor parameter, finds the matching bean, and passes it in automatically. This is **constructor injection** — the recommended way to wire dependencies in Spring because it makes the class testable and the dependencies explicit.

Example:
```java
// Java version — you do everything
class Engine {
    void start() { System.out.println("Engine started"); }
}

class Car {
    Engine engine;
    
    Car(Engine engine) {        // Car needs an Engine
        this.engine = engine;
        engine.start();
    }
}

// You manually create and wire
Engine engine = new Engine();
Car car = new Car(engine);
```

------------------------

```java
// Spring version — Spring does the wiring
@Component
class Engine {
    void start() { System.out.println("Engine started"); }
}

@Component
class Car {
    Engine engine;
    
    Car(Engine engine) {        // same constructor, Spring fills this
        this.engine = engine;
    }
}

// Spring internally does this for you on startup
beans.put(Engine.class, new Engine());
beans.put(Car.class, new Car(beans.get(Engine.class)));
```

---

Same code. Same constructor. You just added `@Component` and Spring replaced your manual `new Engine()` and `new Car(engine)` lines.


-----------------------------
```
@Component 
class Engine { void start() { System.out.println("Engine started"); } }

@Component 
class Car { 
Engine engine;
Car(Engine engine) {        // same constructor, Spring fills this
    this.engine = engine;
}
void isEngineReady(){engine.start();} 
}



// Spring internally does this for you on startup beans.put(Engine.class, new Engine()); beans.put(Car.class, new Car(beans.get(Engine.class)));
```

QUESTION: in this example, Car(engine engine) constructor is automatically called in spring when ever someone calls Car.isEngineReady()?

The constructor is called **once at startup**, not every time `isEngineReady()` is called.

Here's the exact sequence:

**At application startup:**

1. Spring scans for `@Component` classes
2. Creates `new Engine()` and stores it
3. Creates `new Car(engine)` — passing the already-created Engine — and stores it
4. Both beans now live in the Spring container, fully wired

**When you call `car.isEngineReady()`:**

- Spring just hands you the **already-created Car instance**
- `engine` is already sitting there as a field, injected long ago
- `isEngineReady()` just calls `this.engine.start()` on the pre-wired reference

So the constructor ran **once**. The method call just uses what was already assembled.

---

A useful mental model:

```
Startup:    Engine e = new Engine();
            Car car  = new Car(e);      // constructor fires HERE, once

Later:      car.isEngineReady();        // no construction, just method call
            car.isEngineReady();        // same instance, same engine ref
            car.isEngineReady();        // still the same
```

This is the whole point of a DI container — objects are **built once, wired once, reused everywhere**. If the constructor fired on every method call, you'd be creating thousands of objects and defeating the purpose entirely.
- 
----------------------------------------------------------------------
## What is an object???

**Object = Data + Behavior, bundled together**

Before OOP, you had:

```
// Just raw data floating around
String engineType = "V8";
int horsepower = 400;

// And separate functions
void start(String engineType, int horsepower) { ... }
void stop(String engineType) { ... }
```

Data and behavior were **disconnected**. You had to manually pass data to every function.

---

**Object solves this by grouping them:**

java

```java
class Engine {
    String type = "V8";      // data
    int horsepower = 400;    // data

    void start() {           // behavior that KNOWS about its own data
        System.out.println(type + " engine started");
    }
}
```

Now `start()` doesn't need anything passed in — it already **owns** its data.

---

**The three real purposes:**

|Purpose|What it means|
|---|---|
|**State**|Object remembers things (`this.engine`, `this.type`)|
|**Behavior**|Object knows what to do with its state (`start()`, `stop()`)|
|**Identity**|This Car is distinct from that Car — two instances, different state|

---

**The deeper purpose — modeling the real world:**

Code has to represent real things — a payment, a user, a transaction. An object lets you say:

```
This Payment has:
  - amount → state
  - currency → state
  - process() → behavior that acts on its own state
```

Instead of scattered variables and functions everywhere, the object is a **self-contained unit of responsibility**.

---
## Question: any thread in the stack will know how things are connected because of the object. it just explains the connection but nothing else. spring creates single object, but we can always create multiple objects right?

Yes, exactly on both points!

---

**"Object explains the connection" — perfectly put:**

```
Car object just says:
"I know where Engine is"      ← that's it
"I know what to do with it"   ← that's it

Thread comes in, borrows that knowledge, executes, leaves.
Object just sits there knowing things.
```

---

**Yes, you can always create multiple objects:**

java

```java
// Manual creation — nothing stopping you
Engine e1 = new Engine();
Engine e2 = new Engine();

Car carA = new Car(e1);    // carA knows e1
Car carB = new Car(e2);    // carB knows e2
Car carC = new Car(e1);    // carC also knows e1 — shared
```

---

**Spring's singleton is just a default choice, not a rule:**

java

```java
// Default — one instance
@Component
class Car { }

// Explicitly one instance
@Scope("singleton")
class Car { }

// New instance every time someone asks for it
@Scope("prototype")
class Car { }

// One instance per HTTP request
@Scope("request")
class Car { }
```

---

**When would you want multiple objects?**

|Scenario|Why multiple|
|---|---|
|`User` object|Every user has different state — name, email, balance|
|`Payment` object|Each payment is a distinct transaction|
|`Car` in a dealership app|Each car has different model, color, price|
|`Engine` in singleton|Stateless utility — no reason to duplicate|

---

**The key distinction:**

- **Stateless beans** (services, repositories) → singleton makes sense, no unique data per instance
- **Stateful domain objects** (User, Payment, Order) → multiple instances, each with their own data

------------
## Question: so when you say objects are built once, wired once, reused everywhere. 3 threads running in parallel, borrows car object tht's created. how can they run in parallel if there is only one object built?

The key insight is — **object and execution are two different things**.

---

**The object is just data sitting on the heap:**

```
Car object on heap:
┌─────────────┐
│ this.engine ─┼──→ Engine object
└─────────────┘
   (just data,
   not "running"
   anything)
```

The object itself has no concept of "running". It's just a structure holding references. **Methods are not stored in the object** — they're just bytecode instructions sitting in memory, shared by everyone.

---

**Threads bring their own execution context:**

```
Thread 1 ──→ reads Car.this.engine ──→ executes start() ──→ stack frame destroyed
Thread 2 ──→ reads Car.this.engine ──→ executes start() ──→ stack frame destroyed  
Thread 3 ──→ reads Car.this.engine ──→ executes start() ──→ stack frame destroyed
                    ↑
            all pointing to same
            engine reference, but
            each executing independently
```

Each thread just **reads** the `this.engine` reference (which never changes after startup) and independently executes the method logic on their own stack.

---

**Real world analogy:**

Think of a **recipe book** (the object) in a kitchen. The book just sits there. 3 chefs (threads) can all open the same book, read the same recipe, and cook simultaneously — each with their own ingredients (stack variables), their own pan, their own counter space. The book doesn't "run" — the chefs do.

---

**So parallel execution works because:**

||Reality|
|---|---|
|Object|Passive data on heap, just sits there|
|Method|Shared bytecode instructions, not owned by any thread|
|Thread|Active executor, brings its own stack, reads object data, runs instructions|

The object being "one" doesn't block parallel execution — it's not a bottleneck unless threads are **writing** to shared fields, which is the race condition problem from earlier.

## You said: w