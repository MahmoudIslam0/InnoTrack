#!/bin/bash

# Start the sync worker service in the background
echo "Starting background Sync Worker..."
python src/similarity_model/sync_projects.py &

# Start the FastAPI API server in the foreground
echo "Starting Uvicorn API server..."
exec uvicorn api.main:app --host 0.0.0.0 --port 7860
