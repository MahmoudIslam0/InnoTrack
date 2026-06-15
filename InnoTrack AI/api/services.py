import pandas as pd
from fastapi import HTTPException

from src.similarity_model import find_similar_projects
from src.similarity_model import extract_features


def analyze_project(
    title: str,
    description: str,
    abstract: str = "",
    features=None,
    top_k: int = 5
):

    if features is None:
        features = []

    full_text = f"{title}. {abstract}. {description}"

    auto_features = extract_features(full_text)

    merged = []
    seen = set()

    for item in features + auto_features:
        val = str(item).strip().lower()

        if val and val not in seen:
            seen.add(val)
            merged.append(val)

    results = find_similar_projects(
        title=title,
        description=f"{abstract} {description}",
        features=merged,
        top_k=top_k
    )

    if not isinstance(results, pd.DataFrame) or len(results) == 0:
        return {
            "message": "No similar projects found",
            "extracted_features": merged,
            "overall_originality_score": 100.0
        }

    # -----------------------------------
    # رجع Top K كله
    # -----------------------------------
    top_projects = []

    for _, row in results.iterrows():
        orig_score = round(float(row.get("originality_score", 0)), 2)
        sim_percent = round(float(row.get("hybrid_score", 0)) * 100, 2)

        top_projects.append({
            "project_title": row.get("project_title", ""),
            "project_features": row.get("candidate_features", []),
            "matched_features": row.get("matched_features", []),
            "unique_features": row.get("unique_candidate_features", []),
            "similarity_score": sim_percent,
            "final_originality_score": orig_score
        })

    # Overall = worst-case originality (against the most similar project)
    overall_originality_score = top_projects[0]["final_originality_score"]

    return {
        "extracted_features": merged,
        "overall_originality_score": overall_originality_score,
        "top_similar_projects": top_projects
    }



def chat_with_llm(user_id: str, message: str):
    try:
        from src.recommendation_engine.chatbot_engine import chatbot
        from src.recommendation_engine.llm_client import LLMProviderError
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"LLM service could not start: {exc}"
        )

    try:
        response = chatbot(
            user_id=user_id,
            user_input=message
        )
    except LLMProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message
        )

    return {
        "user_id": user_id,
        "response": response
    }
