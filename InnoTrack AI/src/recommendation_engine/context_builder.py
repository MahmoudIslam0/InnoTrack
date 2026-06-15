import logging
import re

from collections import Counter
from typing import Dict, Any, List
from functools import lru_cache
from difflib import get_close_matches

import pandas as pd

from src.similarity_model import (
    find_similar_projects,
    extract_features
)

from src.recommendation_engine.config import (
    SIMILARITY_TOP_K,
    MAX_FEATURES
)

logger = logging.getLogger(__name__)

DOMAIN_KEYWORDS = {
    "AI & Machine Learning": [
        "ai", "artificial intelligence", "machine learning", "ml", "deep learning",
        "neural network", "nlp", "computer vision"
    ],
    "Business & Finance": [
        "fintech", "finance", "bank", "payment", "crypto", "blockchain", "business", "trading"
    ],
    "Cloud & DevOps": [
        "cloud", "devops", "aws", "azure", "docker", "kubernetes", "infrastructure"
    ],
    "Cybersecurity": [
        "security", "cyber", "cybersecurity", "threat", "attack", "malware", "hacking"
    ],
    "Education": [
        "education", "school", "learning", "edtech", "student", "university", "academic"
    ],
    "Healthcare": [
        "hospital", "health", "medical", "healthcare", "clinic", "patient", "care"
    ],
    "IoT & Embedded Systems": [
        "iot", "embedded", "hardware", "sensor", "arduino", "raspberry", "smart home"
    ],
    "Web & Mobile Development": [
        "web", "mobile", "app", "ios", "android", "frontend", "backend", "fullstack", "website"
    ],
    "Data Science & Analytics": [
        "data", "analytics", "science", "big data", "dashboard", "statistics"
    ],
    "E-Commerce & Marketplaces": [
        "ecommerce", "shopping", "retail", "store", "marketplace", "shop"
    ],
    "Smart Systems": [
        "smart system", "automation", "smart city", "smart"
    ],
    "Networking & Communication": [
        "networking", "communication", "telecom", "5g", "network"
    ],
    "Game Development": [
        "game", "gaming", "unity", "unreal", "ar", "vr"
    ],
    "Others": [
        "general", "random", "anything", "any", "whatever", "surprise me", "mixed", "all", "open", "everything", "other"
    ]
}

def normalize(text: str) -> str:

    text = str(text).lower().strip()

    text = re.sub(r"[^a-z0-9\s]", " ", text)

    text = re.sub(r"\s+", " ", text).strip()

    return text

def clean_list(
    items: List[str],
    limit: int = 20
) -> List[str]:

    final = []

    seen = set()

    for item in items:

        val = normalize(item)

        if not val:
            continue

        if val not in seen:

            seen.add(val)

            final.append(val)

    return final[:limit]

def detect_domains(text: str) -> List[str]:

    text = normalize(text)

    detected = []

    words_in_text = set(text.split())

    for domain, words in DOMAIN_KEYWORDS.items():

        for w in words:

            
            if " " in w:

                if w in text:

                    detected.append(domain)
                    break

            
            else:

                if w in words_in_text:

                    detected.append(domain)
                    break

    return clean_list(detected, limit=3)

def extract_domain(text: str) -> str:

    if not text:
        return ""

    text = normalize(text)

    
    if text in ["ai", "ml"]:
        return "artificial intelligence"

    
    # Map normalized domain names to their original keys
    normalized_domains = {normalize(d): d for d in DOMAIN_KEYWORDS.keys()}
    if text in normalized_domains:
        return normalized_domains[text]

    # Check close matches against normalized domain names
    match_domain = get_close_matches(
        text,
        list(normalized_domains.keys()),
        n=1,
        cutoff=0.85
    )
    if match_domain:
        return normalized_domains[match_domain[0]]

    if text in DOMAIN_KEYWORDS:
        return text

    
    domains = detect_domains(text)

    if domains:

        
        for d in domains:

            if d != "general":
                return d

        return domains[0]

    
    all_words = []

    word_map = {}

    for domain, words in DOMAIN_KEYWORDS.items():

        for w in words:

            all_words.append(w)

            word_map[w] = domain

    match = get_close_matches(
        text,
        all_words,
        n=1,
        cutoff=0.75
    )

    if match:
        return word_map[match[0]]

    
    for domain, words in DOMAIN_KEYWORDS.items():

        for w in words:

            if text in w or w.startswith(text):

                return domain

    others_keywords = DOMAIN_KEYWORDS.get("Others", [])
    if any(ow in text for ow in others_keywords):
        return "Others"

    return ""

@lru_cache(maxsize=100)
def cached_similarity(
    title: str,
    description: str
):

    return find_similar_projects(
        title=title,
        description=description,
        top_k=SIMILARITY_TOP_K
    )

def extract_common_features(
    results: pd.DataFrame
) -> List[str]:

    counter = Counter()

    if not isinstance(results, pd.DataFrame):
        return []

    for _, row in results.iterrows():

        matches = row.get(
            "matched_features",
            []
        )

        for item in matches:

            if isinstance(item, dict):

                feat = item.get(
                    "feature_b",
                    ""
                )

                feat = normalize(feat)

                if feat:

                    counter[feat] += 1

    return [
        feat
        for feat, _
        in counter.most_common(12)
    ]

def extract_titles(
    results: pd.DataFrame
) -> List[str]:

    if not isinstance(results, pd.DataFrame):
        return []

    titles = [
        str(row.get("project_title", "")).strip()
        for _, row in results.iterrows()
        if row.get("project_title")
    ]

    return clean_list(titles, limit=10)

def build_architecture_hints(
    domains: List[str]
) -> List[str]:

    hints = []

    if "artificial intelligence" in domains:
        hints.extend([
            "AI inference pipeline",
            "Model prediction workflow",
            "Data preprocessing module"
        ])

    if "healthcare" in domains:
        hints.extend([
            "Emergency handling workflow",
            "Patient monitoring logic",
            "Medical alert system"
        ])

    if "security" in domains:
        hints.extend([
            "Threat detection pipeline",
            "Behavior anomaly analysis",
            "Risk monitoring engine"
        ])

    if "education" in domains:
        hints.extend([
            "Adaptive learning workflow",
            "Student performance analytics",
            "Recommendation engine"
        ])

    return clean_list(hints, limit=10)

def build_project_context(
    title: str,
    description: str,
    abstract: str = "",
    features: List[str] = None
) -> Dict[str, Any]:

    features = features or []

    logger.info("Building project context")

    full_text = (
        f"{title}. "
        f"{abstract}. "
        f"{description}"
    )

    
    
    
    domains = detect_domains(full_text)

    main_domain = (
        domains[0]
        if domains
        else "general"
    )

    
    
    
    auto_features = extract_features(
        full_text
    )

    user_features = clean_list(
        features + auto_features,
        MAX_FEATURES
    )

    
    
    
    try:

        results = cached_similarity(
            title,
            description
        )

    except Exception as e:

        logger.warning(
            f"Similarity failed: {e}"
        )

        results = None

    
    
    
    if (
        not isinstance(results, pd.DataFrame)
        or len(results) == 0
        or "message" in results.columns
    ):

        return {
            "project_title": title,
            "domain": main_domain,
            "domains": domains,
            "features": user_features,
            "similar_titles": [],
            "common_features": [],
            "unique_features": user_features,
            "architecture_hints": build_architecture_hints(domains),
            "originality_score": 99.0,
            "context_strength": 0.0
        }

    
    
    
    similar_titles = extract_titles(results)

    common_features = extract_common_features(
        results
    )

    unique_features = [
        f
        for f in user_features
        if f not in common_features
    ]

    hybrid_scores = results.get(
        "hybrid_score",
        pd.Series([0])
    )

    context_strength = float(
        hybrid_scores.mean()
    )

    return {
        "project_title": title,
        "domain": main_domain,
        "domains": domains,
        "features": user_features,
        "similar_titles": similar_titles,
        "common_features": common_features,
        "unique_features": unique_features,
        "architecture_hints": build_architecture_hints(domains),
        "originality_score": calibrate_originality(context_strength),
        "context_strength": round(context_strength, 4)
    }

def calibrate_originality(similarity: float) -> float:
    """
    Piecewise linear calibration curve mapping database similarity to originality percentage.
    - S <= 0.45: maps linearly to O in [85.0%, 99.0%]
    - S > 0.45: maps linearly to O in [5.0%, 85.0%]
    """
    s = max(0.0, min(1.0, float(similarity)))
    if s <= 0.45:
        originality = 99.0 - (s / 0.45) * 14.0
    else:
        originality = 85.0 - ((s - 0.45) / 0.55) * 80.0
    return round(originality, 2)




def build_domain_context(
    domain: str
) -> Dict[str, Any]:

    extracted = extract_domain(domain)

    if extracted and extracted.lower() != "others":
        domain_clean = extracted
    else:
        logger.info(
            f"[DOMAIN INFO] Using custom dynamic domain: {domain}"
        )

        domain_clean = normalize(domain)

    logger.info(
        f"Building domain context: {domain_clean}"
    )

    try:

        results = cached_similarity(
            domain_clean,
            domain_clean
        )

    except Exception as e:

        logger.warning(
            f"Domain similarity failed: {e}"
        )

        results = None

    if (
        not isinstance(results, pd.DataFrame)
        or len(results) == 0
        or "message" in results.columns
    ):

        return {
            "domain": domain_clean,
            "existing_titles": [],
            "common_features": [],
            "architecture_hints": build_architecture_hints([domain_clean]),
            "context_strength": 0.0
        }

    hybrid_scores = results.get(
        "hybrid_score",
        pd.Series([0])
    )

    return {
        "domain": domain_clean,
        "existing_titles": extract_titles(results),
        "common_features": extract_common_features(results),
        "architecture_hints": build_architecture_hints([domain_clean]),
        "context_strength": round(
            float(hybrid_scores.mean()),
            4
        )
    }
