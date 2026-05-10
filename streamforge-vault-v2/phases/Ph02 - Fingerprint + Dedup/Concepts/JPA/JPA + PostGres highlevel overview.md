### JPA + PostgreSQL — How It Works

**The big picture:** You work with Java objects. JPA translates them to SQL. You never write SQL for basic operations.

---

**The annotations and what they mean:**

java

```java
@Entity                          // "this class = a database table"
@Table(name = "stream_events")   // "specifically this table"
public class StreamEventEntity {

    @Id                          // "this field = primary key"
    private UUID id;

    private String sourceId;     // auto maps to column "source_id"
    private String type;         // auto maps to column "type"

    @Column(columnDefinition = "jsonb")       // "store as JSONB type in postgres"
    @Convert(converter = MapToJsonConverter.class) // "use this to convert Map → JSON string before saving"
    private Map<String, Object> payload;

    private Instant timestamp;   // auto maps to TIMESTAMPTZ
    private String fingerprint;  // auto maps to VARCHAR
}
```

---

**The repository:**

java

```java
// this interface is all you need
// JPA generates save, findById, delete, findAll automatically
public interface StreamEventRepository extends JpaRepository<StreamEventEntity, UUID> {}
```

---

**What happens on `repository.save(entity)`:**

```
Your Java object
      ↓
JPA reads @Entity annotations
      ↓
Runs @Convert on special fields (Map → JSON string)
      ↓
Generates INSERT SQL automatically
      ↓
Executes against PostgreSQL
```

---

**The two constructors rule:**

java

```java
public StreamEventEntity() {}  
// JPA needs this — uses it when READING from DB
// creates empty object first, then sets each field

public StreamEventEntity(UUID id, String sourceId ...) {}  
// you use this when WRITING to DB
// pass all values upfront
```

---

**Why entity class and not a record?**

|Record|Entity Class|
|---|---|
|Immutable|Mutable|
|Domain object|DB object|
|`StreamEvent`|`StreamEventEntity`|

JPA reads from DB by creating an empty object and setting fields one by one — needs mutability. Records are immutable so they can't be JPA entities.

---

**One line summary:** `@Entity` tells JPA the shape of your table. `repository.save()` does the rest — no SQL needed.

[[How is StreamEventRepository linked to postgres?]]
[[StreamEventEntity's JPA Explanation]]
