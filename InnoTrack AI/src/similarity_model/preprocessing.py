import re
import logging
import yake
import numpy as np
from functools import lru_cache
from pathlib import Path
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

MODEL_NAME = "all-mpnet-base-v2"

@lru_cache(maxsize=1)
def _get_embed_model():
    logger.info(f"Loading embed model: {MODEL_NAME}")
    return SentenceTransformer(MODEL_NAME)

MIN_WORDS = 8
MAX_WORDS = 4000

def normalize_text(text):
    if pd.isna(text):
        return ""
    text = str(text).lower().strip()
    text = re.sub(r"http\S+|www\S+|\S+@\S+", " ", text)
    text = re.sub(r"[^a-z0-9\+\#\./\- ]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def substring_deduplicate(features):
    features = sorted(features, key=len, reverse=True)
    kept = []
    for feat in features:
        is_substring = False
        for longer_feat in kept:
            if feat in longer_feat:
                is_substring = True
                break
        if not is_substring:
            kept.append(feat)
    return kept

def semantic_deduplicate(features, model, threshold=0.85):
    if len(features) <= 1:
        return features

    embeddings = model.encode(
        features,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    kept = []
    for i, feat in enumerate(features):
        redundant = False
        for existing in kept:
            sim = cosine_similarity(
                embeddings[i].reshape(1, -1),
                embeddings[existing].reshape(1, -1)
            )[0][0]
            if sim >= threshold:
                redundant = True
                break
        if not redundant:
            kept.append(i)

    return [features[i] for i in kept]

@lru_cache(maxsize=1)
def _get_yake_extractor():
    logger.info("Initializing YAKE NLP feature extractor")
    return yake.KeywordExtractor(lan="en", n=3, dedupLim=0.9, top=20, features=None)

import json

_feature_db_frequencies = None

def load_feature_frequencies_cache():
    global _feature_db_frequencies
    if _feature_db_frequencies is None:
        try:
            from src.similarity_model.semantic_search import load_metadata
            df = load_metadata()
            from collections import Counter
            counter = Counter()
            total_docs = len(df)
            if total_docs > 0:
                for feats in df["features"]:
                    if isinstance(feats, str):
                        try:
                            feats = json.loads(feats)
                        except:
                            feats = []
                    if isinstance(feats, list):
                        seen = set(str(f).strip().lower() for f in feats)
                        for f in seen:
                            if f:
                                counter[f] += 1
                _feature_db_frequencies = {k: v / total_docs for k, v in counter.items()}
            else:
                _feature_db_frequencies = {}
        except Exception:
            _feature_db_frequencies = {}
    return _feature_db_frequencies

def extract_features(text: str) -> list:
    """
    Extracts detailed, multi-word phrases generated purely by YAKE.
    Filters out highly generic features appearing in > 15% of indexed projects.
    """
    matched = []
    try:
        kw_extractor = _get_yake_extractor()
        yake_results = kw_extractor.extract_keywords(text)
        
        freq_cache = load_feature_frequencies_cache()
        max_df_threshold = 0.15  # Filter if keyword appears in > 15% of database
        
        for kw, score in yake_results:
            kw_clean = str(kw).strip().lower()
            if len(kw_clean.split()) > 1 and kw_clean not in matched:
                # Apply IDF filter check
                doc_freq = freq_cache.get(kw_clean, 0.0)
                if doc_freq <= max_df_threshold:
                    matched.append(kw_clean)
                
    except Exception as e:
        logger.error(f"YAKE extraction failed: {e}")

    if not matched:
        return []

    matched = substring_deduplicate(matched)
    return semantic_deduplicate(matched, _get_embed_model(), threshold=0.85)

def preprocess_dataset(df):
    logger.info("Starting preprocessing...")
    df = df.copy()

    df.columns = df.columns.str.strip().str.lower().str.replace(r"\W+", "_", regex=True)

    column_mapping = {
        "title": "project_title",
        "ai_summary": "ai_summary",
        "technologies": "technologies",
        "keywords": "keywords",
        "abstract": "abstract",
        "description": "description",
        "problem_statement": "problem_statement",
        "proposed_solution": "proposed_solution",
        "objectives": "objectives",
        "category": "category"
    }

    df = df.rename(columns=column_mapping)

    for col in ["project_title", "abstract", "description"]:
        if col not in df.columns:
            df[col] = ""
        df[col] = df[col].fillna("").astype(str)

    df["full_content"] = df["project_title"] + ". " + df["abstract"] + ". " + df["description"]
    df["clean_text"] = df["full_content"].apply(normalize_text)

    before = len(df)
    df = df.drop_duplicates(subset=["project_title", "clean_text"]).copy()
    logger.info(f"Removed duplicates: {before-len(df)}")

    df["word_count"] = df["clean_text"].str.split().str.len()
    df = df[df["word_count"].between(MIN_WORDS, MAX_WORDS)].copy()
    df.reset_index(drop=True, inplace=True)

    logger.info("Extracting features...")
    df["features"] = df["clean_text"].apply(extract_features)
    df = df[df["features"].apply(len) > 0].copy()
    df.reset_index(drop=True, inplace=True)

    logger.info(f"Final rows: {len(df)}")
    return df
