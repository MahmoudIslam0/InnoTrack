-- SQL Server DDL for SyncQueue table
-- Path: D:\GRAD!!!!\Final\Graduation_Project-v1.2\Data\database\create_sync_queue.sql

IF OBJECT_ID('SyncQueue', 'U') IS NULL
BEGIN
    CREATE TABLE SyncQueue (
        QueueId INT IDENTITY(1,1) PRIMARY KEY,
        ProjectId INT NOT NULL,
        OperationType VARCHAR(10) NOT NULL,
        Processed BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ProcessedAt DATETIME2 NULL,
        RetryCount INT NOT NULL DEFAULT 0,
        ErrorMessage NVARCHAR(MAX) NULL,
        CONSTRAINT CHK_SyncQueue_OperationType CHECK (OperationType IN ('UPSERT', 'DELETE'))
    );

    -- Index to optimize querying of unprocessed items in chronological order
    CREATE INDEX IX_SyncQueue_Unprocessed 
    ON SyncQueue (Processed, CreatedAt) 
    INCLUDE (ProjectId, OperationType, RetryCount);
    
    PRINT 'SyncQueue table and index IX_SyncQueue_Unprocessed created successfully.';
END
ELSE
BEGIN
    PRINT 'SyncQueue table already exists.';
END
