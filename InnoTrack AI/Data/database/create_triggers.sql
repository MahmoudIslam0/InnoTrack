-- SQL Server Triggers for Projects Table
-- Path: D:\GRAD!!!!\Final\Graduation_Project-v1.2\Data\database\create_triggers.sql

-- 1. INSERT Trigger
IF OBJECT_ID('trg_Projects_Insert', 'TR') IS NOT NULL
    DROP TRIGGER trg_Projects_Insert;
GO

CREATE TRIGGER trg_Projects_Insert
ON Projects
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO SyncQueue (ProjectId, OperationType, Processed, CreatedAt, RetryCount)
    SELECT Id, 'UPSERT', 0, SYSUTCDATETIME(), 0
    FROM inserted
    WHERE Status IN ('Completed', 'UnderReview', 'In_Progress')
      AND NOT EXISTS (
          SELECT 1 FROM SyncQueue 
          WHERE ProjectId = inserted.Id AND Processed = 0 AND OperationType = 'UPSERT'
      );
END;
GO

-- 2. DELETE Trigger
IF OBJECT_ID('trg_Projects_Delete', 'TR') IS NOT NULL
    DROP TRIGGER trg_Projects_Delete;
GO

CREATE TRIGGER trg_Projects_Delete
ON Projects
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Cancel any pending unprocessed UPSERT operations for these deleted projects
    UPDATE SyncQueue
    SET Processed = 1, 
        ProcessedAt = SYSUTCDATETIME(),
        ErrorMessage = 'Superseded by DELETE operation'
    WHERE ProjectId IN (SELECT Id FROM deleted) AND Processed = 0;

    -- Enqueue DELETE operation for previously eligible deleted projects
    INSERT INTO SyncQueue (ProjectId, OperationType, Processed, CreatedAt, RetryCount)
    SELECT Id, 'DELETE', 0, SYSUTCDATETIME(), 0
    FROM deleted
    WHERE Status IN ('Completed', 'UnderReview', 'In_Progress');
END;
GO

-- 3. UPDATE Trigger
IF OBJECT_ID('trg_Projects_Update', 'TR') IS NOT NULL
    DROP TRIGGER trg_Projects_Update;
GO

CREATE TRIGGER trg_Projects_Update
ON Projects
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Case A: Project remains eligible or becomes eligible (Status in Completed, UnderReview, In_Progress)
    -- Enqueue an UPSERT operation (if not already pending unprocessed UPSERT)
    INSERT INTO SyncQueue (ProjectId, OperationType, Processed, CreatedAt, RetryCount)
    SELECT i.Id, 'UPSERT', 0, SYSUTCDATETIME(), 0
    FROM inserted i
    WHERE i.Status IN ('Completed', 'UnderReview', 'In_Progress')
      AND NOT EXISTS (
          SELECT 1 FROM SyncQueue q
          WHERE q.ProjectId = i.Id AND q.Processed = 0 AND q.OperationType = 'UPSERT'
      );

    -- Case B: Project transitions from eligible status to ineligible status
    -- Cancel any pending unprocessed UPSERT operations
    UPDATE q
    SET q.Processed = 1,
        q.ProcessedAt = SYSUTCDATETIME(),
        q.ErrorMessage = 'Superseded by transition to Ineligible status'
    FROM SyncQueue q
    JOIN inserted i ON q.ProjectId = i.Id
    JOIN deleted d ON i.Id = d.Id
    WHERE q.Processed = 0
      AND d.Status IN ('Completed', 'UnderReview', 'In_Progress')
      AND i.Status NOT IN ('Completed', 'UnderReview', 'In_Progress');

    -- Enqueue a DELETE operation to remove it from preprocess/embeddings
    INSERT INTO SyncQueue (ProjectId, OperationType, Processed, CreatedAt, RetryCount)
    SELECT i.Id, 'DELETE', 0, SYSUTCDATETIME(), 0
    FROM inserted i
    JOIN deleted d ON i.Id = d.Id
    WHERE d.Status IN ('Completed', 'UnderReview', 'In_Progress')
      AND i.Status NOT IN ('Completed', 'UnderReview', 'In_Progress')
      AND NOT EXISTS (
          SELECT 1 FROM SyncQueue q
          WHERE q.ProjectId = i.Id AND q.Processed = 0 AND q.OperationType = 'DELETE'
      );
END;
GO
