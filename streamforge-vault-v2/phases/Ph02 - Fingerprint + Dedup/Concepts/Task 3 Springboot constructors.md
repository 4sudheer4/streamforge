---
tags:
  - code
  - task3
  - ph02
  - java
phase:
date: 2026-05-07
---

# `ClassName` / `methodName`

## 💡 What It Is

We implemented DeduplicationEngine class and its constructor.

## 📝 How It Works

java

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


## 🤔 Why This Design
**Why X not Y:**

**Tradeoff:**

## ⚠️ Gotcha


## 🔗 Related
- 
