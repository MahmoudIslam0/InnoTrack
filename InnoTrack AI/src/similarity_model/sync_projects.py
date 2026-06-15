import sys
from pathlib import Path

# Ensure workspace root is in path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from src.similarity_model.sync_worker import run_worker

def sync_projects():
    """
    Entry point to run the event-driven synchronization worker.
    This replaces the old 60-second polling-based full-table scan loop.
    """
    run_worker()

if __name__ == "__main__":
    sync_projects()
