import logging
from typing import Dict, Any, List, Optional
from functools import lru_cache

import pandas as pd

from src.similarity_model import (
    normalize_text,
    extract_features,
    load_model,
    load_faiss_index,
    load_metadata,
    search_by_text,
    load_feature_model,
    safe_feature_list,
    compute_feature_similarity,
    compute_hybrid_score,
    compute_originality,
    compute_confidence,
    risk_label
)

# ---------------------------------------------------------------------------
# Cross-encoder for paraphrase detection (lazy-loaded, cached)
# ---------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _load_cross_encoder():
    from sentence_transformers import CrossEncoder
    logger.info("Loading cross-encoder: cross-encoder/stsb-distilroberta-base")
    return CrossEncoder("cross-encoder/stsb-distilroberta-base", max_length=512)

CROSS_ENCODER_THRESHOLD = 0.60   # minimum cross-score to trigger boost
CROSS_ENCODER_MAX_BOOST = 0.30   # maximum hybrid_score boost from cross-encoder
WORKFLOW_COVERAGE_THRESH = 0.50  # minimum coverage to trigger workflow penalty
WORKFLOW_FEATURE_THRESH  = 0.45  # minimum feature_score to trigger workflow penalty
WORKFLOW_MAX_BOOST       = 0.10  # maximum hybrid_score boost from workflow overlap

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

TITLE_COL = "project_title"
FEATURE_COL = "features"

DEFAULT_TOP_K = 5
DEFAULT_SEARCH_POOL = 50
DEFAULT_MIN_SEMANTIC_SCORE = 0.10
MAX_QUERY_FEATURES = 12

def build_raw_text(
    title: str = "",
    abstract: str = "",
    description: str = ""
) -> str:
    """
    Merge available text fields.
    """
    parts = [
        str(title).strip(),
        str(abstract).strip(),
        str(description).strip()
    ]

    return ". ".join(
        [p for p in parts if p]
    ).strip()

def merge_features(
    title: str = "",
    abstract: str = "",
    description: str = "",
    features: Optional[List[str]] = None,
    auto_extract: bool = True
) -> List[str]:
    """
    Use same extractor from preprocessing.py
    + merge manual features
    + remove duplicates
    """

    if features is None:
     features = []

    manual_features = safe_feature_list(features)

    raw_text = build_raw_text(
        title=title,
        abstract=abstract,
        description=description
    )

    auto_features = []

    if auto_extract:
        auto_features = extract_features(
            normalize_text(raw_text)
        )
    final = []
    seen = set()

    
    for feat in manual_features + auto_features:

        feat = str(feat).strip().lower()

        if feat and feat not in seen:
            seen.add(feat)
            final.append(feat)

    return final[:MAX_QUERY_FEATURES]

def build_query_project(
    title: str,
    abstract: str,
    description: str,
    features: List[str]
) -> Dict[str, Any]:

    return {
        TITLE_COL: str(title).strip(),
        "abstract": str(abstract).strip(),
        "description": str(description).strip(),
        FEATURE_COL: features
    }

def build_query_text(
    title: str,
    abstract: str,
    description: str,
    features: List[str]
) -> str:
    """
    Build semantic query text.
    """

    raw_text = build_raw_text(
        title=title,
        abstract=abstract,
        description=description
    )

    feature_text = " ".join(features)

    text = f"{raw_text}. {feature_text}"

    return normalize_text(text)

def compare_candidate(
    query_project: Dict[str, Any],
    candidate_row,
    semantic_score: float,
    feature_model
) -> Dict[str, Any]:

    candidate_features = safe_feature_list(
        candidate_row[FEATURE_COL]
    )

    feature_result = compute_feature_similarity(
        query_project[FEATURE_COL],
        candidate_features,
        model=feature_model
    )

    feature_score = feature_result["score"]
    coverage = feature_result["coverage"]

    query_feature_count = len(
        query_project[FEATURE_COL]
    )

    unique_query_count = len(
        feature_result["unique_a"]
    )

    base_similarity = compute_hybrid_score(
        semantic_score=semantic_score,
        feature_score=feature_score,
        coverage=coverage,
        feature_count=query_feature_count,
        unique_query_count=unique_query_count
    )

    # Calculate Jaccard word overlap on description + abstract to detect direct copy-pastes
    query_desc = (str(query_project.get("abstract", "")) + " " + str(query_project.get("description", ""))).strip()
    candidate_desc = (str(candidate_row.get("abstract", "")) + " " + str(candidate_row.get("description", ""))).strip()
    
    words_q = set(normalize_text(query_desc).split())
    words_c = set(normalize_text(candidate_desc).split())
    
    jaccard_overlap = 0.0
    if words_q and words_c:
        jaccard_overlap = len(words_q.intersection(words_c)) / len(words_q.union(words_c))

    if jaccard_overlap >= 0.60:
        hybrid_score = 0.95
    else:
        hybrid_score = base_similarity

    originality_score = compute_originality(
        hybrid_score=hybrid_score,
        unique_query_features=unique_query_count,
        total_query_features=query_feature_count
    )

    confidence_score = compute_confidence(
        semantic_score=semantic_score,
        feature_score=feature_score,
        coverage=coverage
    )

    return {
        "project_id": int(candidate_row.name),
        "project_title": candidate_row[TITLE_COL],

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

        "matched_features":
            feature_result["matches"],

        "unique_query_features":
            feature_result["unique_a"],

        "unique_candidate_features":
            feature_result["unique_b"],
            
        "candidate_features":
            candidate_features
    }

def find_similar_projects(
    title: str = "",
    abstract: str = "",
    description: str = "",
    features: Optional[List[str]] = None,
    top_k: int = DEFAULT_TOP_K,
    search_pool: int = DEFAULT_SEARCH_POOL,
    auto_extract_features: bool = True,
    exclude_self: bool = False
) -> pd.DataFrame:
    """
    Final Smart Pipeline

    Supports:
    - title only
    - title + description
    - title + abstract
    - title + abstract + description
    - optional features
    """

    logger.info(
        "Loading models and artifacts..."
    )

    load_model()
    load_faiss_index()

    feature_model = load_feature_model()
    df = load_metadata()

    
    
    
    logger.info(
        "Preparing query..."
    )

    if not exclude_self:
        # Check local/cached metadata dataframe first (extremely fast, zero DB/network overhead)
        existing_project = df[
            df["project_title"].str.lower().str.strip()
            ==
            title.lower().strip()
        ]
        
        if len(existing_project) > 0:
            logger.info("Exact title match found in local metadata cache — returning originality = 0")
            matched_row = existing_project.iloc[0]
            project_id = int(matched_row.name)
            stored_features = safe_feature_list(matched_row["features"])
            matched_title = matched_row["project_title"]
            matched_abstract = matched_row.get("abstract", "")
            matched_desc = matched_row.get("description", "")
            
            return pd.DataFrame([{
                "project_id":           project_id,
                "project_title":        matched_title,
                "semantic_score":       1.0,
                "feature_score":        1.0,
                "coverage":             1.0,
                "hybrid_score":         1.0,
                "originality_score":    0.0,
                "confidence_score":     1.0,
                "duplicate_risk":       "Very High",
                "shared_features_count": len(stored_features),
                "matched_features":     [{"feature_a": f, "feature_b": f, "score": 1.0} for f in stored_features],
                "unique_query_features": [],
                "unique_candidate_features": [],
                "query_features_used":  stored_features,
                "query_clean_text":     title,
                "candidate_features":   stored_features,
                "abstract":             matched_abstract,
                "description":          matched_desc
            }])

        # If not found in cache, check database table 'preprocess' directly
        db_match_found = False
        db_project_id = None
        db_features = []
        db_abstract = ""
        db_description = ""
        matched_title = title
        
        try:
            import json
            from Data.database.sql_connector import engine
            from sqlalchemy import text
            
            with engine.connect() as conn:
                db_row = conn.execute(text("""
                    SELECT id, project_title, features, abstract, description
                    FROM preprocess
                    WHERE LOWER(LTRIM(RTRIM(project_title))) = LOWER(:title)
                """), {"title": title.strip()}).fetchone()
                
            if db_row:
                db_match_found = True
                db_project_id, matched_title, features_json, db_abstract, db_description = db_row
                # Parse features
                try:
                    db_features = json.loads(features_json) if isinstance(features_json, str) else features_json
                    if isinstance(db_features, str):
                        db_features = json.loads(db_features)
                except Exception:
                    db_features = []
                if not isinstance(db_features, list):
                    db_features = []
        except Exception as db_exc:
            logger.warning(f"Direct database check of 'preprocess' table failed: {db_exc}")
    
        if db_match_found:
            logger.info("Exact title match found in database 'preprocess' table — returning originality = 0")
            project_id = int(db_project_id)
            stored_features = db_features
            matched_abstract = db_abstract
            matched_desc = db_description
                
            return pd.DataFrame([{
                "project_id":           project_id,
                "project_title":        matched_title,
                "semantic_score":       1.0,
                "feature_score":        1.0,
                "coverage":             1.0,
                "hybrid_score":         1.0,
                "originality_score":    0.0,
                "confidence_score":     1.0,
                "duplicate_risk":       "Very High",
                "shared_features_count": len(stored_features),
                "matched_features":     [{"feature_a": f, "feature_b": f, "score": 1.0} for f in stored_features],
                "unique_query_features": [],
                "unique_candidate_features": [],
                "query_features_used":  stored_features,
                "query_clean_text":     title,
                "candidate_features":   stored_features,
                "abstract":             matched_abstract,
                "description":          matched_desc
            }])

    logger.info("Extracting new features")

    final_features = merge_features(
        title=title,
        abstract=abstract,
        description=description,
        features=features,
        auto_extract=auto_extract_features
    )

    query_project = build_query_project(
        title=title,
        abstract=abstract,
        description=description,
        features=final_features
    )

    query_text = build_query_text(
        title=title,
        abstract=abstract,
        description=description,
        features=final_features
    )

    
    
    
    logger.info(
        "Running semantic retrieval..."
    )

    semantic_results = search_by_text(
        query_text=query_text,
        k=search_pool + (5 if exclude_self else 0),
        min_score=DEFAULT_MIN_SEMANTIC_SCORE
    )

    if "message" in semantic_results.columns:
        return semantic_results
        
    if exclude_self and title.strip():
        semantic_results = semantic_results[
            semantic_results["project_title"].str.lower().str.strip() != title.lower().strip()
        ]

    
    
    
    logger.info(
        "Running hybrid ranking..."
    )

    rows = []

    for _, row in semantic_results.iterrows():

        candidate_id = int(
            row["project_id"]
        )

        semantic_score = float(
            row["score"]
        )

        candidate_row = df.loc[
            candidate_id
        ]

        result = compare_candidate(
            query_project=query_project,
            candidate_row=candidate_row,
            semantic_score=semantic_score,
            feature_model=feature_model
        )

        rows.append(result)

    if not rows:
        return pd.DataFrame([{
            "message":
            "No strong similar projects found."
        }])

    import numpy as np
    from src.similarity_model.explainability import generate_explanation

    final_df = pd.DataFrame(rows)

    # Sort results
    final_df = final_df.sort_values(
        by=[
            "hybrid_score",
            "confidence_score",
            "semantic_score"
        ],
        ascending=False
    ).reset_index(drop=True)

    # -----------------------------------------------------------------
    # CROSS-ENCODER RE-SCORING (top-1 candidate only)
    # -----------------------------------------------------------------
    if len(final_df) > 0:
        top_row = final_df.iloc[0]
        candidate_id = int(top_row["project_id"])
        candidate_row = df.loc[candidate_id]

        # Build full texts for cross-encoder comparison
        query_full = build_raw_text(
            title=title, abstract=abstract, description=description
        )
        candidate_full = build_raw_text(
            title=str(candidate_row.get(TITLE_COL, "")),
            abstract=str(candidate_row.get("abstract", "")),
            description=str(candidate_row.get("description", ""))
        )

        try:
            cross_encoder = _load_cross_encoder()
            cross_score = float(
                cross_encoder.predict([(query_full, candidate_full)])[0]
            )
            # stsb model already outputs [0, 1] — clamp for safety
            cross_score = max(0.0, min(1.0, cross_score))
            logger.info(
                f"Cross-encoder score (top-1): {cross_score:.4f}"
            )
        except Exception as exc:
            logger.warning(f"Cross-encoder failed, skipping: {exc}")
            cross_score = 0.0

        # Apply cross-encoder boost if threshold met
        if cross_score >= CROSS_ENCODER_THRESHOLD:
            boost = CROSS_ENCODER_MAX_BOOST * (
                (cross_score - CROSS_ENCODER_THRESHOLD)
                / (1.0 - CROSS_ENCODER_THRESHOLD)
            )
            original_hybrid = float(final_df.loc[0, "hybrid_score"])
            boosted_hybrid = min(1.0, original_hybrid + boost)
            final_df.loc[0, "hybrid_score"] = round(boosted_hybrid, 4)
            logger.info(
                f"Cross-encoder boost: {original_hybrid:.4f} -> {boosted_hybrid:.4f} "
                f"(+{boost:.4f})"
            )

        # -----------------------------------------------------------------
        # WORKFLOW OVERLAP PENALTY
        # -----------------------------------------------------------------
        top_coverage = float(top_row.get("coverage", 0.0))
        top_feat_score = float(top_row.get("feature_score", 0.0))

        if (top_coverage >= WORKFLOW_COVERAGE_THRESH
                and top_feat_score >= WORKFLOW_FEATURE_THRESH):
            workflow_boost = (
                WORKFLOW_MAX_BOOST * top_coverage * top_feat_score
            )
            current_hybrid = float(final_df.loc[0, "hybrid_score"])
            boosted_hybrid = min(1.0, current_hybrid + workflow_boost)
            final_df.loc[0, "hybrid_score"] = round(boosted_hybrid, 4)
            logger.info(
                f"Workflow overlap boost: {current_hybrid:.4f} -> "
                f"{boosted_hybrid:.4f} (+{workflow_boost:.4f})"
            )

    # -----------------------------------------------------------------
    # DECAYING AGGREGATION over Top-5
    # -----------------------------------------------------------------
    K_val = min(5, len(final_df))
    if K_val > 0:
        s1 = float(final_df.loc[0, "hybrid_score"])
        density_penalty = 0.0
        beta = 0.05
        lam = 0.5
        for i in range(1, K_val):
            si = float(final_df.loc[i, "hybrid_score"])
            density_penalty += np.exp(-lam * i) * si

        aggregated_score = min(1.0, s1 + beta * density_penalty)

        # Recalculate originality based on aggregated similarity score
        aggregated_originality = compute_originality(
            hybrid_score=aggregated_score
        )
        if aggregated_score >= 0.90:
            aggregated_originality = 0.0

        final_df.loc[0, "originality_score"] = aggregated_originality
    else:
        aggregated_score = 0.0

    # Retain the top match
    final_df = final_df.head(top_k).copy()
    
    # Overwrite originality score for any project with >= 0.90 hybrid score to 0.0
    final_df.loc[
        final_df["hybrid_score"] >= 0.90,
        "originality_score"
    ] = 0.0

    final_df["query_features_used"] = [
        final_features
    ] * len(final_df)

    final_df["query_clean_text"] = [
        query_text
    ] * len(final_df)

    # Generate explanation
    if len(final_df) > 0:
        overall_orig = float(final_df.loc[0, "originality_score"])
        explanation_text = generate_explanation(overall_orig, final_df, final_features)
        final_df["explanation"] = explanation_text

    return final_df

