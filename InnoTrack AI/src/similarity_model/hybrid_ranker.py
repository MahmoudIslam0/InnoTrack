import logging
import math
from typing import List, Dict, Any

import pandas as pd

from src.similarity_model import (
    compute_feature_similarity,
    load_feature_model,
    safe_feature_list
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

TITLE_COL = "project_title"
FEATURE_COL = "features"

DEFAULT_SEMANTIC_WEIGHT = 0.65
DEFAULT_FEATURE_WEIGHT = 0.35

HIGH_FEATURE_WEIGHT = 0.45
LOW_FEATURE_WEIGHT = 0.20

BONUS_WEIGHT = 0.05
MIN_HYBRID_SCORE = 0.05

def clamp(value: float) -> float:
    """
    Keep score inside [0,1]
    """
    return max(0.0, min(1.0, float(value)))

def get_dynamic_weights(
    feature_count: int,
    coverage: float
):
    """
    Adaptive weights depending on feature richness.
    Returns (semantic_w, feature_w, coverage_w) — always sum to 1.0
    """
    if feature_count < 5:
        # Sparse Feature Set configuration
        return 0.75, 0.15, 0.10
    else:
        # Rich Feature Set configuration
        return 0.50, 0.35, 0.15

def compute_hybrid_score(
    semantic_score,
    feature_score,
    coverage,
    feature_count,
    unique_query_count=0
) -> float:

    semantic_score = clamp(semantic_score)
    feature_score  = clamp(feature_score)
    coverage       = clamp(coverage)

    shared_count = feature_count - unique_query_count

    # Hard duplicate: most features shared, almost nothing unique
    if shared_count >= 6 and unique_query_count <= 1:
        return 0.95

    # Near-total feature coverage with high similarity
    if coverage >= 0.90 and feature_score >= 0.65:
        return round(
            clamp(
                0.75 +
                (0.15 * feature_score) +
                (0.10 * semantic_score)
            ),
            4
        )

    # Get adaptive weights regardless of feature availability
    semantic_w, feature_w, coverage_w = get_dynamic_weights(
        feature_count, coverage
    )

    if coverage == 0:
        if semantic_score >= 0.70:
            semantic_w = 0.50 + ((semantic_score - 0.70) / 0.30) * 0.50
        else:
            semantic_w = 0.50
        score = semantic_w * semantic_score
    else:
        score = (
            semantic_w * semantic_score +
            feature_w  * feature_score +
            coverage_w * coverage
        )

    # Only penalise low feature score when features actually exist to compare.
    # Skipping this when feature_score==0 prevents an unfair 50% penalty
    # on DB projects that have no stored features.
    if feature_score > 0 and feature_score < 0.40:
        penalty = 0.50 + (feature_score / 0.40) * 0.50
        score *= penalty

    return round(clamp(score), 4)

import numpy as np
import random

_dynamic_baseline_similarity = None

def get_baseline_similarity():
    global _dynamic_baseline_similarity
    if _dynamic_baseline_similarity is None:
        try:
            from src.similarity_model.semantic_search import load_embeddings
            embeddings = load_embeddings()
            n = len(embeddings)
            if n > 1:
                # Sample random pairs
                num_samples = min(2000, n * (n - 1) // 2)
                pairs = set()
                while len(pairs) < num_samples:
                    i = random.randint(0, n - 1)
                    j = random.randint(0, n - 1)
                    if i != j:
                        pairs.add((min(i, j), max(i, j)))
                
                similarities = []
                for i, j in pairs:
                    # Dot product since vectors are normalized
                    sim = float(np.dot(embeddings[i], embeddings[j]))
                    similarities.append(sim)
                _dynamic_baseline_similarity = float(np.median(similarities))
            else:
                _dynamic_baseline_similarity = 0.25
        except Exception:
            _dynamic_baseline_similarity = 0.25
    return _dynamic_baseline_similarity

def compute_originality(
    hybrid_score: float,
    unique_query_features: int = 0,
    total_query_features: int = 0
) -> float:
    """
    Originality Score (0-100).

    Uses a shifted sigmoid calibration so that moderate similarity
    (0.40-0.60) triggers strong originality penalties, while truly
    novel projects (sim < 0.30) retain high originality.

    Sigmoid parameters:
        k        = 14    (steepness of the drop-off)
        midpoint = 0.27  (calibrated similarity where originality ≈ 50%)
    """
    SIGMOID_K = 14
    SIGMOID_MIDPOINT = 0.27

    hybrid_score = clamp(hybrid_score)
    baseline_sim = get_baseline_similarity()

    # Subtraction and Min-Max scaling (unchanged)
    calibrated_similarity = max(
        0.0, (hybrid_score - baseline_sim) / (1.0 - baseline_sim)
    )

    # Sigmoid mapping: converts calibrated_similarity → [0, 1]
    sigmoid_output = 1.0 / (
        1.0 + math.exp(-SIGMOID_K * (calibrated_similarity - SIGMOID_MIDPOINT))
    )

    originality = 100.0 * (1.0 - sigmoid_output)

    return round(max(0.0, min(100.0, originality)), 2)

def compute_confidence(
    semantic_score: float,
    feature_score: float,
    coverage: float
) -> float:
    """
    Trust score for ranking result.
    """

    confidence = (
        0.40 * clamp(semantic_score) +
        0.40 * clamp(feature_score) +
        0.20 * clamp(coverage)
    )

    return round(clamp(confidence), 4)

def risk_label(score: float) -> str:
    """
    Duplicate risk label.
    """

    if score >= 0.90:
        return "Very High"

    if score >= 0.75:
        return "High"

    if score >= 0.55:
        return "Medium"

    if score >= 0.35:
        return "Low"

    return "Very Low"

def compare_single_candidate(
    query_row: Dict[str, Any],
    candidate_row: Dict[str, Any],
    semantic_score: float,
    model=None
) -> Dict[str, Any]:

    if model is None:
        model = load_feature_model()

    query_features = safe_feature_list(
        query_row.get(FEATURE_COL, [])
    )

    candidate_features = safe_feature_list(
        candidate_row.get(FEATURE_COL, [])
    )

    feature_result = compute_feature_similarity(
        query_features,
        candidate_features,
        model=model
    )

    feature_score = feature_result["score"]
    coverage = feature_result["coverage"]

    total_query_features = len(query_features)
    unique_query_count = len(
        feature_result["unique_a"]
    )

    base_similarity = compute_hybrid_score(
        semantic_score=semantic_score,
        feature_score=feature_score,
        coverage=coverage,
        feature_count=total_query_features,
        unique_query_count=unique_query_count
    )

    originality_score = compute_originality(
        hybrid_score=base_similarity,
        unique_query_features=unique_query_count,
        total_query_features=total_query_features
    )

    hybrid_score = base_similarity

    confidence_score = compute_confidence(
        semantic_score=semantic_score,
        feature_score=feature_score,
        coverage=coverage
    )
    print("=" * 50)
    print("BASE SIMILARITY:", base_similarity)
    print("ORIGINALITY:", originality_score)
    print("FINAL SIMILARITY:", hybrid_score)
    print("=" * 50)
    return {
        "project_title":
            candidate_row.get(TITLE_COL, ""),

        "semantic_score":
            round(float(semantic_score), 4),

        "feature_score":
            feature_score,

        "coverage":
            coverage,

        "hybrid_score":
            hybrid_score,

        "originality_score":
            originality_score,

        "confidence_score":
            confidence_score,

        "duplicate_risk":
            risk_label(hybrid_score),

        "shared_features_count":
            feature_result["shared_count"],

        "matches":
            feature_result["matches"],

        "unique_query_features":
            feature_result["unique_a"],

        "unique_candidate_features":
            feature_result["unique_b"],

        "candidate_features":
            candidate_features
    }

def rank_candidates(
    query_row,
    candidate_rows,
    semantic_scores: List[float],
    model=None,
    min_score: float = MIN_HYBRID_SCORE
) -> pd.DataFrame:
    """
    Re-rank semantic retrieval results
    using hybrid logic.
    """

    if model is None:
        model = load_feature_model()

    rows = []

    for candidate_row, sem_score in zip(
        candidate_rows,
        semantic_scores
    ):

        result = compare_single_candidate(
            query_row=query_row,
            candidate_row=candidate_row,
            semantic_score=float(sem_score),
            model=model
        )

        if result["hybrid_score"] >= min_score:
            rows.append(result)

    if not rows:
        return pd.DataFrame([{
            "message": "No strong similar projects found."
        }])

    results = pd.DataFrame(rows)

    results = results.sort_values(
        by=[
            "hybrid_score",
            "confidence_score",
            "semantic_score"
        ],
        ascending=False
    ).reset_index(drop=True)

    return results
