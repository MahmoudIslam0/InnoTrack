from typing import List, Dict, Any
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from scipy.optimize import linear_sum_assignment
from sklearn.metrics.pairwise import cosine_similarity
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

MODEL_NAME = "all-mpnet-base-v2"
SIMILARITY_WEIGHT = 0.70
COVERAGE_WEIGHT = 0.30
DEFAULT_THRESHOLD = 0.65

@lru_cache(maxsize=1)
def load_feature_model():
    logger.info(f"Loading feature model: {MODEL_NAME}")
    return SentenceTransformer(MODEL_NAME)

def safe_feature_list(features):
    """
    Convert any feature input into clean List[str]
    """
    import numpy as np
    import json
    import ast

    if features is None:
        return []

    if isinstance(features, float) and pd.isna(features):
        return []

    if isinstance(features, np.ndarray):
        features = features.tolist()

    if isinstance(features, tuple):
        features = list(features)

    if isinstance(features, str):
        features = features.strip()
        parsed = None
        # Try JSON parsing
        try:
            parsed = json.loads(features)
            if isinstance(parsed, str):
                parsed = json.loads(parsed)
        except:
            pass

        # Try AST parsing as fallback
        if not isinstance(parsed, list):
            try:
                parsed = ast.literal_eval(features)
                if isinstance(parsed, str):
                    parsed = ast.literal_eval(parsed)
            except:
                pass

        if isinstance(parsed, list):
            features = parsed
        else:
            if features:
                features = [features]
            else:
                features = []

    if isinstance(features, list):
        cleaned = []
        for item in features:
            if isinstance(item, dict) and "feature" in item:
                val = str(item["feature"]).strip().lower()
            else:
                val = str(item).strip().lower()
            if val and val != "nan":
                cleaned.append(val)
        return list(dict.fromkeys(cleaned))

    return []

def remove_redundant_features(features):
    cleaned = []
    seen_words = []

    for feat in features:
        feat_words = set(feat.split())
        redundant = False

        for existing in seen_words:
            overlap = len(feat_words & existing) / max(len(feat_words), 1)
            if overlap >= 0.60:
                redundant = True
                break

        if not redundant:
            cleaned.append(feat)
            seen_words.append(feat_words)

    return cleaned

def empty_result(unique_a=None, unique_b=None):
    return {
        "score": 0.0,
        "coverage": 0.0,
        "shared_count": 0,
        "matches": [],
        "unique_a": unique_a or [],
        "unique_b": unique_b or []
    }

@lru_cache(maxsize=10000)
def encode_single_feature(feature: str) -> np.ndarray:
    import numpy as np
    model = load_feature_model()
    return model.encode(
        [feature],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False
    )[0].astype("float32")

def encode_features(
    features: List[str],
    model
):
    import numpy as np
    if not features:
        return np.array([])

    embeddings = []
    for feat in features:
        embeddings.append(encode_single_feature(feat))
    return np.array(embeddings)

def compute_feature_similarity(
    features_a,
    features_b,
    model=None,
    threshold: float = DEFAULT_THRESHOLD
) -> Dict[str, Any]:
    if model is None:
        model = load_feature_model()

    fa = remove_redundant_features(safe_feature_list(features_a))
    fb = remove_redundant_features(safe_feature_list(features_b))

    if not fa or not fb:
        return empty_result(unique_a=fa, unique_b=fb)

    emb_a = encode_features(fa, model)
    emb_b = encode_features(fb, model)

    sim_matrix = cosine_similarity(emb_a, emb_b)
    
    
    row_idx, col_idx = linear_sum_assignment(-sim_matrix)

    matches = []
    matched_a = set()
    matched_b = set()

    for i, j in zip(row_idx, col_idx):
        sim = float(sim_matrix[i, j])
        if sim >= threshold:
            matches.append({
                "feature_a": fa[i],
                "feature_b": fb[j],
                "score": round(sim, 3)
            })
            matched_a.add(i)
            matched_b.add(j)

    import numpy as np
    shared_scores = [m["score"] for m in matches]
    mean_similarity = float(np.mean(shared_scores)) if shared_scores else 0.0

    min_len = min(len(fa), len(fb))
    coverage = len(matches) / min_len if min_len > 0 else 0.0

    sum_similarity = sum(shared_scores)
    final_score = sum_similarity / min_len if min_len > 0 else 0.0

    final_score = min(final_score, 1.0)

    matched_text_a = " ".join([m["feature_a"] for m in matches]).lower()
    matched_text_b = " ".join([m["feature_b"] for m in matches]).lower()

    def is_semantically_redundant(feature, matched_text):
        words = set(feature.lower().split())
        overlap = sum(1 for w in words if w in matched_text)
        return (overlap / max(len(words), 1)) >= 0.5

    unique_a = [
        fa[i] for i in range(len(fa))
        if i not in matched_a and not is_semantically_redundant(fa[i], matched_text_a)
    ]

    unique_b = [
        fb[j] for j in range(len(fb))
        if j not in matched_b and not is_semantically_redundant(fb[j], matched_text_b)
    ]

    return {
        "score": round(final_score, 4),
        "coverage": round(coverage, 4),
        "shared_count": len(matches),
        "matches": matches,
        "unique_a": unique_a,
        "unique_b": unique_b
    }

def compare_projects(
    df: pd.DataFrame,
    idx1: int,
    idx2: int,
    model=None
) -> Dict[str, Any]:
    if idx1 not in df.index or idx2 not in df.index:
        return empty_result()

    f1 = df.loc[idx1, "features"]
    f2 = df.loc[idx2, "features"]

    return compute_feature_similarity(f1, f2, model=model)

def compare_project_against_many(
    df: pd.DataFrame,
    idx1: int,
    indices: List[int],
    model=None
) -> Dict[int, Dict[str, Any]]:
    if idx1 not in df.index:
        return {}

    f1 = df.loc[idx1, 'features']
    results = {}

    for idx2 in indices:
        if idx2 in df.index:
            f2 = df.loc[idx2, 'features']
            results[idx2] = compute_feature_similarity(f1, f2, model=model)

    return results
