"""
SERVER-SIDE rebuild script (Linux / Azure App Service).
Run this once on the deployed server to rebuild the FAISS index with all-mpnet-base-v2.

Usage:
    cd /home/user/app
    python rebuild_index_server.py
"""
import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import sys
sys.path.insert(0, "/home/user/app")

import numpy as np
import pandas as pd
import faiss
from pathlib import Path
from sentence_transformers import SentenceTransformer

MODEL_NAME   = "all-mpnet-base-v2"
MODELS_DIR   = Path("/home/user/app/models")
PARQUET_PATH = MODELS_DIR / "metadata.parquet"
INDEX_PATH   = MODELS_DIR / "faiss_index.bin"
EMBED_PATH   = MODELS_DIR / "project_embeddings.npy"

print(f"[SERVER REBUILD] Model: {MODEL_NAME}")
model = SentenceTransformer(MODEL_NAME)
dim   = model.get_sentence_embedding_dimension()
print(f"[SERVER REBUILD] Embedding dim: {dim}")

df = pd.read_parquet(PARQUET_PATH)
print(f"[SERVER REBUILD] Loaded {len(df)} projects")

def build_text(row):
    return f"{row.get('project_title','') or ''}. {row.get('abstract','') or ''}. {row.get('description','') or ''}".strip()

texts = df.apply(build_text, axis=1).tolist()

print("[SERVER REBUILD] Generating embeddings...")
embeddings = model.encode(
    texts,
    convert_to_numpy=True,
    normalize_embeddings=True,
    show_progress_bar=True,
    batch_size=8
).astype("float32")

print(f"[SERVER REBUILD] Embeddings shape: {embeddings.shape}")
np.save(str(EMBED_PATH), embeddings)

index = faiss.IndexFlatIP(dim)
index.add(embeddings)
faiss.write_index(index, str(INDEX_PATH))

print(f"[SERVER REBUILD] Done! Index: {index.ntotal} vectors @ {dim}-dim")
print("[SERVER REBUILD] Restart the app process to reload the index.")
