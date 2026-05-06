---
tags: []
phase: 
date: 2026-05-06
---

# Title

## 💡 The Point
In Java, the distinction between **mutable** and **immutable** data structures comes down to one simple question: **Can the object’s state change after it is created?**

Understanding this is crucial for writing thread-safe code and avoiding those "wait, how did that value change?" bugs.

## 📝 Notes

## 1. Mutable Data Structures

A mutable object is one whose internal state (the data it holds) **can be modified** after it is instantiated. You can change fields, update values in a list, or swap out elements without creating a new object.

- **Common Examples:** `StringBuilder`, `ArrayList`, `HashMap`, and most "Plain Old Java Objects" (POJOs) you write yourself.
    
- **Pros:** Highly memory efficient for frequent updates (you aren't constantly creating new objects).
    
- **Cons:** Not inherently thread-safe. If two threads change an `ArrayList` at the same time, you'll likely run into a `ConcurrentModificationException`.
    

---

## 2. Immutable Data Structures

An immutable object is a "read-only" object. Once it is born, it never changes. If you want to "modify" it, you actually create a **brand new object** with the updated values.

- **Common Examples:** `String`, `Integer`, `LocalDate`, and the `List.of()` or `Map.of()` collections introduced in newer Java versions.
    
- **Pros:** * **Thread Safety:** Since they never change, multiple threads can read them simultaneously without risk.
    
    - **Security:** Useful for keys in HashMaps or sensitive data like URLs and file paths.
        
- **Cons:** Can be memory-intensive if you are performing thousands of updates (e.g., concatenating strings in a loop).
    

---

## Key Differences at a Glance

|**Feature**|**Mutable (e.g., ArrayList)**|**Immutable (e.g., String)**|
|---|---|---|
|**State Change**|Can be changed via "setters" or modifiers.|Fixed at creation; no setters allowed.|
|**Thread Safety**|Requires manual synchronization.|Naturally thread-safe.|
|**Performance**|Faster for frequent modifications.|Slower for frequent modifications (object overhead).|
|**Memory**|Reuses the same memory space.|Creates new objects in memory for "changes."|

---

## How to Make a Class Immutable

If you want to create your own immutable class (a common practice in modern Java), follow these rules:

1. **Declare the class as `final`** so it cannot be extended.
    
2. **Make all fields `private` and `final`**.
    
3. **Do not provide "setter" methods.**
    
4. **Deep Copy:** If the class contains references to mutable objects (like a `Date` or a `List`), ensure that the constructor and "getter" methods return a copy, not the original reference.
    

### The Modern Way: Java Records

Starting in Java 14/16, you can use **Records** to create immutable data carriers instantly:

Java

```
public record User(String name, int age) {} 
// This is automatically final, with final fields and no setters!
```
## ⚠️ Gotcha / Watch Out


## 🔗 Related
- 
