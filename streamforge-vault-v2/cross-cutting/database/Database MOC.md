# Database MOC

> All database notes — PostgreSQL, Flyway, JPA, query patterns.

---

## PostgreSQL
- [[B-Tree Index Explained]]
- [[Keyset vs Offset Pagination]]
- [[Adjacency List vs Closure Table]]

## Flyway
- 

## JPA / Hibernate
- 

## Query Patterns
- 

---

## Key Principles

### Index or Seq Scan
> Always run `EXPLAIN (ANALYZE, BUFFERS)` after adding an index. The planner might still choose a seq scan if the selectivity is low or types don't match. Verify — don't assume.

### Schema Changes
> Flyway migrations are immutable once applied. New behavior = new migration file. Never edit V1, V2 etc.

---

## Add Your Own Notes
- 
