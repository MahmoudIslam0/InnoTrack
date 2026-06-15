import re
import ast
import logging
from pathlib import Path
from functools import lru_cache

import numpy as np
import pandas as pd
import faiss
from sentence_transformers import SentenceTransformer

from Data.database.sql_connector import (
    load_preprocessed_projects
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

DEFAULT_MODEL = "all-mpnet-base-v2"

TITLE_COL = "project_title"
TECH_COL = "technologies"

_PROJECT_ROOT = Path(__file__).resolve().parents[2]

INDEX_PATH = _PROJECT_ROOT / "models" / "faiss_index.bin"
META_PATH  = _PROJECT_ROOT / "models" / "metadata.parquet"
EMBED_PATH = _PROJECT_ROOT / "models" / "project_embeddings.npy"

TOP_K = 20
MIN_SCORE = 0.35

def normalize_text(text: str) -> str:
    """
    Normalize user query to match preprocessing style.
    """
    if pd.isna(text):
        return ""

    text = str(text).strip().lower()

    text = re.sub(r"http\S+|www\S+|\S+@\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s\+\#\./\-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text

def tokenize(text: str) -> set:
    """
    Tokenize normalized text.
    """
    return set(normalize_text(text).split())

import os

_cached_faiss_index = None
_cached_faiss_index_mtime = None
_cached_metadata = None
_cached_metadata_mtime = None
_cached_embeddings = None
_cached_embeddings_mtime = None

@lru_cache(maxsize=1)
def load_model():
    logger.info(f"Loading model: {DEFAULT_MODEL}")
    return SentenceTransformer(DEFAULT_MODEL)

def load_faiss_index():
    global _cached_faiss_index, _cached_faiss_index_mtime
    if not INDEX_PATH.exists():
        raise FileNotFoundError("FAISS index not found.")

    mtime = os.path.getmtime(INDEX_PATH)
    if _cached_faiss_index is None or _cached_faiss_index_mtime != mtime:
        logger.info(f"Loading FAISS index from {INDEX_PATH} (mtime: {mtime})...")
        _cached_faiss_index = faiss.read_index(str(INDEX_PATH))
        _cached_faiss_index_mtime = mtime
    return _cached_faiss_index

def load_metadata():
    global _cached_metadata, _cached_metadata_mtime
    if not INDEX_PATH.exists():
        raise FileNotFoundError("FAISS index not found for metadata alignment.")

    mtime = os.path.getmtime(INDEX_PATH)
    if _cached_metadata is None or _cached_metadata_mtime != mtime:
        if META_PATH.exists():
            logger.info(f"Loading metadata from local parquet {META_PATH} (syncing with FAISS index mtime: {mtime})...")
            try:
                df = pd.read_parquet(str(META_PATH))
                if "features" in df.columns:
                    import json
                    def parse_features(x):
                        if not isinstance(x, str):
                            return x
                        try:
                            x = json.loads(x)
                            if isinstance(x, str):
                                x = json.loads(x)
                            return x
                        except Exception:
                            return []
                    df["features"] = df["features"].apply(parse_features)
                _cached_metadata = df.reset_index(drop=True)
            except Exception as e:
                logger.warning(f"Failed to read local metadata.parquet: {e}. Falling back to database query...")
                df = load_preprocessed_projects()
                _cached_metadata = df.reset_index(drop=True)
        else:
            logger.info(f"Loading metadata from Azure SQL (syncing with FAISS index mtime: {mtime})...")
            df = load_preprocessed_projects()
            _cached_metadata = df.reset_index(drop=True)
        _cached_metadata_mtime = mtime
    return _cached_metadata

def load_embeddings():
    global _cached_embeddings, _cached_embeddings_mtime
    if not EMBED_PATH.exists():
        raise FileNotFoundError("Embeddings not found.")

    mtime = os.path.getmtime(EMBED_PATH)
    if _cached_embeddings is None or _cached_embeddings_mtime != mtime:
        logger.info(f"Loading embeddings from {EMBED_PATH} (mtime: {mtime})...")
        _cached_embeddings = np.load(str(EMBED_PATH))
        _cached_embeddings_mtime = mtime
    return _cached_embeddings

def build_results(
    df: pd.DataFrame,
    ids,
    scores,
    query_text: str = "",
    min_score: float = MIN_SCORE
) -> pd.DataFrame:

    rows = []

    query_words = tokenize(query_text)

    for idx, score in zip(ids, scores):

        if idx == -1:
            continue

        row = df.loc[idx]

        final_score = float(score)
        
        if query_words:

            title_words = tokenize(row[TITLE_COL])

            tech_words = tokenize(
                row.get(TECH_COL, "")
            )

            overlap = len(query_words & title_words)
            overlap += len(query_words & tech_words)

            if overlap > 0:
                final_score += 0.02 * overlap

                final_score = min(final_score, 1.0)

        if final_score < min_score:
            continue

        rows.append({
            "project_id": int(idx),
            "project_title": row[TITLE_COL],
            "technologies": row.get(TECH_COL, ""),
            "score": round(final_score, 4)
        })

    if not rows:
        return pd.DataFrame([{
            "message": "No similar projects found.",
            "score": 0
        }])

    return (
        pd.DataFrame(rows)
        .sort_values("score", ascending=False)
        .reset_index(drop=True)
    )

def search_by_text(
    query_text: str,
    k: int = TOP_K,
    min_score: float = MIN_SCORE
) -> pd.DataFrame:

    model = load_model()
    index = load_faiss_index()
    df = load_metadata()

    query_clean = normalize_text(query_text)

    query_vec = model.encode(
        [query_clean],
        convert_to_numpy=True,
        normalize_embeddings=True
    ).astype("float32")

    scores, ids = index.search(query_vec, k)

    return build_results(
        df=df,
        ids=ids[0],
        scores=scores[0],
        query_text=query_clean,
        min_score=min_score
    )

def search_by_project_id(
    project_id: int,
    k: int = TOP_K,
    min_score: float = MIN_SCORE,
    exclude_self: bool = True
) -> pd.DataFrame:

    df = load_metadata()
    index = load_faiss_index()
    embeddings = load_embeddings()

    if project_id < 0 or project_id >= len(df):
        raise IndexError("Project ID out of range.")

    query_vec = embeddings[
        project_id
    ].reshape(1, -1).astype("float32")

    extra_k = k + 1 if exclude_self else k

    scores, ids = index.search(
        query_vec,
        extra_k
    )

    rows = []

    for idx, score in zip(ids[0], scores[0]):

        if idx == -1:
            continue

        if exclude_self and idx == project_id:
            continue

        final_score = min(float(score), 1.0)

        if final_score < min_score:
            continue

        row = df.loc[idx]

        rows.append({
            "project_id": int(idx),
            "project_title": row[TITLE_COL],
            "technologies": row.get(TECH_COL, ""),
            "score": round(final_score, 4)
        })

        if len(rows) == k:
            break

    if not rows:
        return pd.DataFrame([{
            "message": "No similar projects found.",
            "score": 0
        }])

    return pd.DataFrame(rows)

def compare_two_ideas(
    text_a: str,
    text_b: str
) -> float:

    model = load_model()

    vecs = model.encode(
        [
            normalize_text(text_a),
            normalize_text(text_b)
        ],
        convert_to_numpy=True,
        normalize_embeddings=True
    ).astype("float32")

    score = float(np.dot(vecs[0], vecs[1]))

    return round(score, 4)
