import json
import logging
import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity

# Ensure workspace root is in path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from Data.database.sql_connector import engine
from src.similarity_model.preprocessing import preprocess_dataset, normalize_text
from src.similarity_model.semantic_search import load_model
from src.similarity_model.feature_similarity import load_feature_model, compute_feature_similarity
from src.similarity_model.hybrid_ranker import compute_hybrid_score, compute_originality

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

def run_sync_preprocess():
    logger.info("Initializing Sync and Preprocess Service...")
    
    # 1. Verify DB Connection
    try:
        with engine.connect() as conn:
            logger.info("Database connection verified successfully.")
    except Exception as exc:
        logger.error(f"Unable to connect to the SQL database. Error: {exc}")
        sys.exit(1)

    # 2. Fetch raw projects
    logger.info("Pulling active records from 'Projects' table...")
    projects_query = """
    SELECT *
    FROM Projects
    WHERE Status IN (
        'Completed',
        'UnderReview',
        'In_Progress'
    )
    """
    with engine.connect() as conn:
        raw_df = pd.read_sql(projects_query, conn)
    logger.info(f"Loaded {len(raw_df)} active projects from 'Projects' table.")

    # 3. Preprocess dataset
    logger.info("Preprocessing dataset...")
    processed_df = preprocess_dataset(raw_df)
    logger.info(f"Total projects after preprocessing filters: {len(processed_df)}")

    if len(processed_df) == 0:
        logger.warning("No projects left after preprocessing. Exiting.")
        return

    # 4. Standarize / clean columns to match structure in the screenshot
    cols_to_keep = [
        "id",
        "submittedat",
        "project_title",
        "studentnames",
        "year",
        "abstract",
        "description",
        "problemstatement",
        "proposedsolution",
        "objectives",
        "full_content",
        "clean_text",
        "word_count",
        "features"
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

    # 5. Calculate Originality for each project
    logger.info("Calculating originality score for each project...")
    
    # Load models
    model = load_model()
    feature_model = load_feature_model()

    # Generate embeddings for all preprocessed projects
    rich_texts = []
    for idx, row in processed_df.iterrows():
        title = str(row["project_title"]).strip()
        abstract = str(row["abstract"]).strip()
        description = str(row["description"]).strip()
        feats = row["features"] if isinstance(row["features"], list) else []
        
        raw_text = f"{title}. {abstract}. {description}"
        feature_text = " ".join(feats)
        full_text = normalize_text(f"{raw_text}. {feature_text}")
        rich_texts.append(full_text)

    logger.info("Encoding projects to vector space...")
    embeddings = model.encode(
        rich_texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True
    ).astype("float32")

    # Compute cosine similarity matrix
    logger.info("Computing semantic similarity matrix...")
    sim_matrix = cosine_similarity(embeddings, embeddings)

    originality_scores = []

    # Loop through each project to find closest match and compute originality
    for i in range(len(processed_df)):
        current_project = processed_df.iloc[i]
        current_features = current_project["features"] if isinstance(current_project["features"], list) else []
        
        # Get semantic similarity scores against other projects
        scores = sim_matrix[i].copy()
        scores[i] = -1.0  # Exclude self-matching
        
        # Sort and pick top 50 semantic matches as candidates
        top_indices = np.argsort(scores)[::-1][:50]
        
        max_hybrid_score = 0.0
        best_candidate_features = []
        best_candidate_idx = -1
        
        for idx in top_indices:
            candidate_project = processed_df.iloc[idx]
            sem_score = float(scores[idx])
            
            candidate_features = candidate_project["features"] if isinstance(candidate_project["features"], list) else []
            
            # Compute feature similarity
            feat_result = compute_feature_similarity(
                current_features,
                candidate_features,
                model=feature_model
            )
            
            feature_score = feat_result["score"]
            coverage = feat_result["coverage"]
            
            query_feature_count = len(current_features)
            unique_query_count = len(feat_result["unique_a"])
            
            # Compute hybrid score
            hybrid_score = compute_hybrid_score(
                semantic_score=sem_score,
                feature_score=feature_score,
                coverage=coverage,
                feature_count=query_feature_count,
                unique_query_count=unique_query_count
            )
            
            # Direct copy-paste detection
            query_desc = (str(current_project.get("abstract", "")) + " " + str(current_project.get("description", ""))).strip()
            candidate_desc = (str(candidate_project.get("abstract", "")) + " " + str(candidate_project.get("description", ""))).strip()
            
            words_q = set(normalize_text(query_desc).split())
            words_c = set(normalize_text(candidate_desc).split())
            
            jaccard_overlap = 0.0
            if words_q and words_c:
                jaccard_overlap = len(words_q.intersection(words_c)) / len(words_q.union(words_c))
                
            if jaccard_overlap >= 0.60:
                hybrid_score = 0.95
                
            if hybrid_score > max_hybrid_score:
                max_hybrid_score = hybrid_score
                best_candidate_features = candidate_features
                best_candidate_idx = idx

        # Calculate originality based on the worst-case (highest similarity) match
        if best_candidate_idx != -1 and len(current_features) > 0:
            # Recompute feature similarity for the best candidate to get unique_a count
            feat_result = compute_feature_similarity(
                current_features,
                best_candidate_features,
                model=feature_model
            )
            unique_query_count = len(feat_result["unique_a"])
            orig_score = compute_originality(
                hybrid_score=max_hybrid_score,
                unique_query_features=unique_query_count,
                total_query_features=len(current_features)
            )
        else:
            orig_score = compute_originality(
                hybrid_score=max_hybrid_score,
                unique_query_features=0,
                total_query_features=0
            )
            
        originality_scores.append(orig_score)

    processed_df["originality"] = originality_scores
    logger.info("Finished calculating originality scores.")

    # 6. Save locally to preprocessed.csv in Data/processed/
    local_dir = Path("Data") / "processed"
    local_dir.mkdir(parents=True, exist_ok=True)
    local_path = local_dir / "preprocessed.csv"
    
    # Keep features as readable lists for the CSV file
    csv_df = processed_df.copy()
    csv_df.to_csv(local_path, index=False)
    logger.info(f"Successfully saved preprocessed projects locally to: {local_path}")

    # 7. Convert features list to JSON string for database push
    db_df = processed_df.copy()
    db_df["features"] = db_df["features"].apply(json.dumps)

    # 8. Push to table 'preprocess' in database
    logger.info("Uploading preprocessed records to database table 'preprocess'...")
    try:
        with engine.begin() as conn:
            # Drop/replace table if exists to write the new preprocessed structure
            db_df.to_sql(
                "preprocess",
                conn,
                if_exists="replace",
                index=False
            )
        logger.info("Successfully pushed all preprocessed projects to database table 'preprocess'.")
    except Exception as exc:
        logger.error(f"Failed to push table to database. Error: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    run_sync_preprocess()
