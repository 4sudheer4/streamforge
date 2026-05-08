package com.streamforge.infra;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

// JPA generates all DB operations automatically — save, findById, delete etc.
// You write zero SQL for basic operations
public interface StreamEventRepository extends JpaRepository<StreamEventEntity, UUID> {}