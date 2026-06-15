import os
import sys
import json
import time
import logging
import pandas as pd
from pathlib import Path
from sqlalchemy import text

# Ensure workspace root is in path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from Data.database.sql_connector import engine
from src.similarity_model.preprocessing import preprocess_dataset
from src.similarity_model.embedding_engine import train_embedding_engine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("SyncWorker")

# Settings
BATCH_SIZE = 10
MAX_RETRIES = 3
POLL_INTERVAL = 5  # seconds
REBUILD_THRESHOLD = 5  # Rebuild FAISS index after 5 database changes
REBUILD_COOLDOWN = 60  # Or after 60 seconds if changes exist but threshold not met

class RebuildManager:
    def __init__(self, rebuild_threshold=REBUILD_THRESHOLD, rebuild_cooldown=REBUILD_COOLDOWN):
        self.rebuild_threshold = rebuild_threshold
        self.rebuild_cooldown = rebuild_cooldown
        self.accumulated_changes = 0
        self.last_rebuild_time = time.time()
        self.pending_rebuild = False

    def record_change(self):
        self.accumulated_changes += 1
        self.pending_rebuild = True

    def check_and_rebuild(self, force=False):
        if not self.pending_rebuild:
            return False

        now = time.time()
        time_elapsed = now - self.last_rebuild_time
        
        # Trigger rebuild if we hit the change threshold, OR if the cooldown has passed, OR if forced
        if force or self.accumulated_changes >= self.rebuild_threshold or time_elapsed >= self.rebuild_cooldown:
            logger.info(
                f"Triggering FAISS index rebuild. "
                f"Accumulated changes: {self.accumulated_changes}, time elapsed: {time_elapsed:.1f}s, force: {force}"
            )
            try:
                train_embedding_engine()
                self.accumulated_changes = 0
                self.last_rebuild_time = now
                self.pending_rebuild = False
                logger.info("FAISS index rebuild completed successfully.")
                return True
            except Exception as e:
                logger.error(f"Failed to rebuild FAISS index: {e}", exc_info=True)
        return False

def process_single_item(engine, item) -> bool:
    queue_id = item["QueueId"]
    project_id = item["ProjectId"]
    operation_type = item["OperationType"]
    
    changed = False
    try:
        # Start transaction for project processing
        with engine.begin() as conn:
            # Re-verify queue item is still unprocessed and lock it
            row = conn.execute(text("""
                SELECT QueueId FROM SyncQueue WITH (UPDLOCK, HOLDLOCK)
                WHERE QueueId = :queue_id AND Processed = 0
            """), {"queue_id": queue_id}).fetchone()
            if not row:
                logger.info(f"Queue item {queue_id} already processed by another worker. Skipping.")
                return False
            
            if operation_type == 'UPSERT':
                # Fetch project from Projects table
                project_df = pd.read_sql(
                    text("SELECT * FROM Projects WHERE Id = :project_id"),
                    conn,
                    params={"project_id": project_id}
                )
                
                eligible = False
                if not project_df.empty:
                    # Support case-insensitive key retrieval
                    status = project_df.iloc[0].get("Status") or project_df.iloc[0].get("status")
                    if status in ["Completed", "UnderReview", "In_Progress"]:
                        eligible = True
                
                if eligible:
                    logger.info(f"Preprocessing eligible project {project_id}...")
                    processed_df = preprocess_dataset(project_df)
                    
                    if not processed_df.empty:
                        # Standardize columns to match preprocess table schema
                        cols_to_keep = [
                            "id", "submittedat", "project_title", "studentnames", "year",
                            "abstract", "description", "problemstatement", "proposedsolution",
                            "objectives", "full_content", "clean_text", "word_count", "features"
                        ]
                        for col in cols_to_keep:
                            if col not in processed_df.columns:
                                processed_df[col] = ""
                        processed_df = processed_df[cols_to_keep]
                        processed_df = processed_df.rename(
                            columns={
                                "submittedat": "submitted_at",
                                "studentnames": "student_names",
                                "problemstatement": "problem_statement",
                                "proposedsolution": "proposed_solution"
                            }
                        )
                        processed_df["features"] = processed_df["features"].apply(json.dumps)
                        
                        # Upsert behavior: delete existing first, then append
                        conn.execute(text("DELETE FROM preprocess WHERE id = :id"), {"id": project_id})
                        processed_df.to_sql("preprocess", conn, if_exists="append", index=False)
                        logger.info(f"Successfully preprocessed and inserted Project {project_id} into 'preprocess'.")
                        changed = True
                    else:
                        logger.info(f"Project {project_id} filtered out by preprocessing. Removing from 'preprocess' table.")
                        conn.execute(text("DELETE FROM preprocess WHERE id = :id"), {"id": project_id})
                        changed = True
                else:
                    logger.info(f"Project {project_id} is ineligible or deleted. Removing from 'preprocess' table.")
                    conn.execute(text("DELETE FROM preprocess WHERE id = :id"), {"id": project_id})
                    changed = True
            
            elif operation_type == 'DELETE':
                logger.info(f"Removing Project {project_id} from 'preprocess' table...")
                conn.execute(text("DELETE FROM preprocess WHERE id = :id"), {"id": project_id})
                changed = True
            
            # Mark queue item as processed successfully
            conn.execute(text("""
                UPDATE SyncQueue
                SET Processed = 1, ProcessedAt = SYSUTCDATETIME(), ErrorMessage = NULL
                WHERE QueueId = :queue_id
            """), {"queue_id": queue_id})
            
        return changed

    except Exception as e:
        logger.error(f"Error processing queue item {queue_id} (Project {project_id}): {e}", exc_info=True)
        # Log failure on SyncQueue in a separate transaction to avoid rollback
        try:
            with engine.begin() as error_conn:
                error_conn.execute(text("""
                    UPDATE SyncQueue
                    SET RetryCount = RetryCount + 1,
                        ErrorMessage = :error_msg,
                        ProcessedAt = CASE WHEN RetryCount + 1 >= :max_retries THEN SYSUTCDATETIME() ELSE NULL END,
                        Processed = CASE WHEN RetryCount + 1 >= :max_retries THEN 1 ELSE 0 END
                    WHERE QueueId = :queue_id
                """), {
                    "queue_id": queue_id,
                    "error_msg": str(e)[:4000],
                    "max_retries": MAX_RETRIES
                })
        except Exception as queue_err:
            logger.error(f"Failed to write error status for queue item {queue_id}: {queue_err}")
        return False

def run_worker():
    logger.info("Initializing Sync Worker service...")
    
    # Verify DB connection and auto-initialize schema/triggers if missing
    try:
        with engine.begin() as conn:
            # 1. Check and create SyncQueue table
            row = conn.execute(text("SELECT OBJECT_ID('SyncQueue', 'U')")).fetchone()
            if row[0] is None:
                logger.info("SyncQueue table does not exist. Initializing from DDL script...")
                ddl_path = Path(__file__).resolve().parents[2] / "Data" / "database" / "create_sync_queue.sql"
                if ddl_path.exists():
                    sql = ddl_path.read_text(encoding="utf-8")
                    conn.execute(text(sql))
                    logger.info("SyncQueue table and indexes created successfully.")
                else:
                    logger.error("DDL script 'create_sync_queue.sql' not found!")
            
            # 2. Check and deploy SQL triggers
            row_trg = conn.execute(text("SELECT OBJECT_ID('trg_Projects_Insert', 'TR')")).fetchone()
            if row_trg[0] is None:
                logger.info("SQL Triggers do not exist on 'Projects'. Deploying triggers...")
                triggers_path = Path(__file__).resolve().parents[2] / "Data" / "database" / "create_triggers.sql"
                if triggers_path.exists():
                    sql_content = triggers_path.read_text(encoding="utf-8")
                    import re
                    # Split by SQL Server GO batch separator and execute statements individually
                    statements = re.split(r'(?i)\bGO\b', sql_content)
                    for stmt in statements:
                        stmt_clean = stmt.strip()
                        if stmt_clean:
                            conn.execute(text(stmt_clean))
                    logger.info("SQL Triggers deployed successfully.")
                else:
                    logger.error("Trigger script 'create_triggers.sql' not found!")
                    
        logger.info("Database connection verified and schema initialized successfully.")
    except Exception as exc:
        logger.critical(f"Database connection or schema initialization failed: {exc}")
        sys.exit(1)
        
    rebuild_manager = RebuildManager()
    
    logger.info("Sync Worker started successfully and polling...")
    while True:
        try:
            # Fetch batch of unprocessed items
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT TOP (:batch_size) QueueId, ProjectId, OperationType, RetryCount
                    FROM SyncQueue WITH (UPDLOCK, READPAST)
                    WHERE Processed = 0 AND RetryCount < :max_retries
                    ORDER BY CreatedAt ASC
                """), {"batch_size": BATCH_SIZE, "max_retries": MAX_RETRIES})
                batch = result.mappings().all()
            
            if not batch:
                # Idle period: force rebuild of any pending changes since queue is empty
                rebuild_manager.check_and_rebuild(force=True)
                time.sleep(POLL_INTERVAL)
                continue
            
            logger.info(f"Fetched {len(batch)} items from SyncQueue.")
            for item in batch:
                changed = process_single_item(engine, item)
                if changed:
                    rebuild_manager.record_change()
            
            # Check if there are any remaining unprocessed items in the queue
            with engine.connect() as conn:
                any_left = conn.execute(text("""
                    SELECT TOP 1 QueueId FROM SyncQueue 
                    WHERE Processed = 0 AND RetryCount < :max_retries
                """), {"max_retries": MAX_RETRIES}).fetchone()
            
            # If no more items are left in the queue, we can rebuild immediately!
            if not any_left:
                rebuild_manager.check_and_rebuild(force=True)
            else:
                rebuild_manager.check_and_rebuild()
            
        except Exception as e:
            logger.error(f"Error in Sync Worker loop: {e}", exc_info=True)
            time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    run_worker()
