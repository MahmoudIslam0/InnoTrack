import logging
from typing import Dict, Any, List, Set

from src.recommendation_engine.context_builder import build_domain_context
from src.recommendation_engine.prompt_builder import build_idea_prompt
from src.recommendation_engine.llm_client import generate_text
from src.recommendation_engine.validator import validate_generated_list

from src.similarity_model import compare_two_ideas, load_metadata
from src.recommendation_engine.novelty_checker import is_idea_novel
from src.recommendation_engine.config import DEFAULT_IDEA_COUNT

logger = logging.getLogger(__name__)

MAX_RETRIES = 5
SIMILARITY_THRESHOLD_LOCAL = 0.60

def normalize_idea(text: str) -> str:
    return " ".join(text.lower().strip().split())

def clean_ideas(ideas: List[str]) -> List[str]:
    return [i.strip() for i in ideas if 2 <= len(i.split()) <= 8]

def is_duplicate_local(idea: str, existing: Set[str]) -> bool:
    for old in existing:
        if compare_two_ideas(idea, old) >= SIMILARITY_THRESHOLD_LOCAL:
            return True
    return False

def fallback_by_domain(domain: str) -> List[str]:
    import random

    domain = (domain or "general").lower()

    fallback_map = {
        "education": [
            "AI adaptive learning system",
            "Student performance prediction platform",
            "Gamified learning mobile application",
            "Automated grading system",
            "Virtual classroom engagement analyzer",
            "AI-powered language tutor for kids",
            "Adaptive curriculum recommendation engine",
            "Dyslexia assistant mobile application"
        ],
        "healthcare": [
            "AI disease prediction system",
            "Smart patient monitoring system",
            "Medical diagnosis assistant",
            "IoT health tracking device",
            "Hospital resource optimization system",
            "Wearable fall detection for elderly",
            "Computer vision surgery tools tracker",
            "Smart appointment booking and triage chat"
        ],
        "fintech": [
            "Fraud detection AI system",
            "Smart expense tracking app",
            "Blockchain payment system",
            "Credit risk prediction model",
            "AI investment advisor",
            "Automated personal budgeting assistant",
            "Cryptocurrency portfolio analyzer",
            "AI invoice processing portal"
        ],
        "general": [
            "AI-powered agricultural crop disease detection mobile app",
            "Blockchain-secured digital academic certificate verification portal",
            "AR-based indoor navigation assistant for visually impaired students",
            "Smart waste sorting bin using computer vision and mechanical sorting",
            "Decentralized federated learning for collaborative medical image classification",
            "Automated license plate recognition and parking management system",
            "AI-driven smart library book recommendation portal",
            "Smart home energy management and load prediction system",
            "Real-time object detection for warehouse inventory tracking",
            "Autonomous delivery robot path planning simulation"
        ]
    }

    ideas = fallback_map.get(domain) or fallback_map.get("general")
    shuffled_ideas = list(ideas)
    random.shuffle(shuffled_ideas)
    return shuffled_ideas

def dynamic_fallback_ideas(
    domain: str,
    count: int,
    exclude_set: Set[str],
    previous_ideas: List[str]
) -> List[str]:
    logger.info(f"Generating dynamic fallback ideas for domain={domain}")
    prompt = f"""
You are an advanced AI research and innovation consultant.
The standard project generator has failed to find unique ideas for the selected domain because of strict originality rules.

DOMAIN:
{domain}

EXISTING CONTEXT:
Please suggest {count} highly creative, unique, yet practical graduation project ideas that do not exist in standard databases.
Avoid any standard topics (like simple prediction dashboards, basic chatbots, or generic automation).
Think of combining different domains to create implementable software/hardware systems (e.g., mobile health tracking + edge-inference, edge computing + precision agriculture, secure e-commerce + decentralized identity).
Ensure the ideas are completely feasible, realistic, and implementable within 6–9 months by a team of undergraduate students. Do NOT suggest highly theoretical, PhD-level, or impossible/sci-fi research topics (no quantum computing algorithms, non-existent sensors, etc.).

PREVIOUS IDEAS TO AVOID:
{", ".join(exclude_set | set(previous_ideas))}

FORMAT:
- One idea per line
- No numbering
- No explanations
- Keep them concise (4-12 words)
"""
    raw_text = generate_text(prompt, task="idea", temperature=0.95)
    if not raw_text:
        return []
    generated = validate_generated_list(text=raw_text, top_k=count)
    generated = clean_ideas(generated)
    
    valid_fallbacks = []
    for idea in generated:
        if not is_idea_novel(idea):
            continue
        valid_fallbacks.append(idea)
    return valid_fallbacks

def generate_ideas(
    domain: str,
    top_k: int = DEFAULT_IDEA_COUNT,
    previous_generated_ideas: List[str] = None
) -> Dict[str, Any]:

    if previous_generated_ideas is None:
        previous_generated_ideas = []

    top_k = max(1, min(top_k, 20))
    domain = domain or "general"

    logger.info(f"Starting idea generation | domain={domain} | top_k={top_k}")

    context = build_domain_context(domain)

    final_ideas: List[str] = []
    final_set: Set[str] = set()
    previous_norm = set(normalize_idea(i) for i in previous_generated_ideas)

    all_generated: List[str] = []
    attempts = 0

    
    
    
    while len(final_ideas) < top_k and attempts < MAX_RETRIES:

        attempts += 1
        logger.info(f"Attempt #{attempts}")

        generation_count = max(top_k * 3, 12)

        prompt = build_idea_prompt(
            context=context,
            count=generation_count,
            previous_ideas=previous_generated_ideas
        )

        raw_text = generate_text(prompt, task="idea")

        if not raw_text:
            logger.warning("Empty LLM response")
            continue

        generated = validate_generated_list(
            text=raw_text,
            top_k=generation_count
        )

        generated = clean_ideas(generated)

        logger.info(f"Generated {len(generated)} ideas")
        all_generated.extend(generated)

        
        
        
        for idea in generated:

            normalized = normalize_idea(idea)

            if not normalized:
                continue

            # Use full database check for >= 85% originality
            if not is_idea_novel(idea):
                logger.info(f"[SKIP DATASET SIMILAR] {idea}")
                continue

            
            if normalized in final_set:
                continue

            
            if normalized in previous_norm:
                logger.info(f"[SKIP PREVIOUS] {idea}")
                continue

            
            skip_similar_prev = False
            for old in previous_generated_ideas:
                if compare_two_ideas(idea, old) >= 0.85:
                    logger.info(f"[SKIP SIMILAR PREVIOUS] {idea}")
                    skip_similar_prev = True
                    break

            if skip_similar_prev:
                continue

            
            if is_duplicate_local(idea, final_set):
                logger.info(f"[SKIP SIMILAR] {idea}")
                continue

            
            logger.info(f"[NEW IDEA] {idea}")

            final_ideas.append(idea)
            final_set.add(normalized)

            if len(final_ideas) >= top_k:
                break

    
    
    
    if len(final_ideas) < top_k:

        logger.warning("Using dynamic fallback ideas")
        needed = top_k - len(final_ideas)
        dynamic_fallback = dynamic_fallback_ideas(
            domain=domain,
            count=needed * 2,
            exclude_set=final_set,
            previous_ideas=previous_generated_ideas
        )

        for f in dynamic_fallback:
            normalized = normalize_idea(f)
            if normalized not in final_set:
                final_ideas.append(f)
                final_set.add(normalized)
            if len(final_ideas) >= top_k:
                break

    if len(final_ideas) < top_k:

        logger.warning("Using static fallback ideas")

        fallback = fallback_by_domain(domain)

        for f in fallback:

            normalized = normalize_idea(f)

            if normalized not in final_set:
                final_ideas.append(f)
                final_set.add(normalized)

            if len(final_ideas) >= top_k:
                break

    logger.info(f"Final ideas: {final_ideas}")

    return {
        "domain": domain,
        "generated_ideas": all_generated,
        "final_ideas": final_ideas
    }
