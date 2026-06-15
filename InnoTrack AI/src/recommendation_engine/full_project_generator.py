from src.recommendation_engine.llm_client import generate_text
from src.recommendation_engine.prompt_builder import (
    build_full_project_prompt
)

import re

def extract_section(text, section_name):

    text = text.strip()

    marker = section_name + ":"

    if marker not in text:
        return ""

    start = text.find(marker) + len(marker)

    sections = [
        "CATEGORY:",
        "ABSTRACT:",
        "DESCRIPTION:",
        "TECHNOLOGIES:",
        "KEYWORDS:",
        "PROBLEM_STATEMENT:",
        "PROPOSED_SOLUTION:",
        "OBJECTIVES:",
        "AI_SUMMARY:",
        "FUTURE_WORK:",
        "METHODOLOGY:"
    ]

    end = len(text)

    for s in sections:

        if s == marker:
            continue

        pos = text.find(s, start)

        if pos != -1 and pos < end:
            end = pos

    return text[start:end].strip()

def parse_bullets(text):

    lines = text.splitlines()

    final = []

    for line in lines:

        line = line.strip()

        if not line:
            continue

        line = re.sub(
            r"^[-•*0-9.\)\s]+",
            "",
            line
        )

        if line:
            final.append(line)

    return final

def generate_full_project(
    title,
    features,
    description="",
    abstract="",
    custom_description=False,
    custom_abstract=False
):

    context = {
        "project_title": title,
        "features": features,
        "description": description,
        "abstract": abstract
    }

    prompt = build_full_project_prompt(context)

    raw = generate_text(
        prompt,
        task="full_project"
    )

    result = {

        
        
        
        "project_title": title,

        "category":
            extract_section(raw, "CATEGORY"),

        "abstract":
            abstract if custom_abstract else extract_section(raw, "ABSTRACT"),

        "description":
            description if custom_description else extract_section(raw, "DESCRIPTION"),

        
        
        
        "technologies":
            parse_bullets(
                extract_section(raw, "TECHNOLOGIES")
            ),

        "keywords":
            parse_bullets(
                extract_section(raw, "KEYWORDS")
            ),

        "objectives":
            parse_bullets(
                extract_section(raw, "OBJECTIVES")
            ),

        "future_work":
            parse_bullets(
                extract_section(raw, "FUTURE_WORK")
            ),

        
        
        
        "problem_statement":
            extract_section(
                raw,
                "PROBLEM_STATEMENT"
            ),

        "proposed_solution":
            extract_section(
                raw,
                "PROPOSED_SOLUTION"
            ),

        "methodology":
            extract_section(
                raw,
                "METHODOLOGY"
            ),

        "ai_summary":
            extract_section(
                raw,
                "AI_SUMMARY"
            )
    }

    
    
    

    if not result.get("category"):
        result["category"] = "General AI System"

    if not result.get("keywords"):
        result["keywords"] = [
            "Artificial Intelligence",
            "Automation",
            "Smart System"
        ]

    if not result.get("problem_statement"):
        result["problem_statement"] = (
            "Current traditional systems suffer from "
            "limited automation, inefficiency, and "
            "lack of intelligent decision-making."
        )

    if not result.get("proposed_solution"):
        result["proposed_solution"] = (
            "The proposed system uses AI-driven "
            "automation and intelligent analytics "
            "to improve operational efficiency."
        )

    if not result.get("objectives"):
        result["objectives"] = [
            "Improve automation efficiency",
            "Enhance system accuracy",
            "Reduce operational costs"
        ]

    if not result.get("methodology"):
        result["methodology"] = (
            "The system will be developed using "
            "data collection, preprocessing, "
            "AI model training, testing, and deployment."
        )

    if not result.get("future_work"):
        result["future_work"] = [
            "Cloud integration",
            "Mobile application support",
            "Advanced AI optimization"
        ]

    if not result.get("ai_summary"):
        result["ai_summary"] = (
            f"{title} is an intelligent AI-powered "
            f"graduation project designed to provide "
            f"automation, monitoring, and predictive analysis."
        )

    return result

def rewrite_custom_sections(features, abstract="", description=""):
    features_text = "\n".join(f"- {f}" for f in features)
    
    prompt = f"""
The user provided custom text for their project's abstract and/or description.
Your task is to update their custom text to incorporate the following NEW FEATURES.

CRITICAL RULES:
1. You MUST preserve the exact tone, style, and core phrasing of the user's original text!
2. Just weave the new features in naturally.
3. EXPAND the content significantly to ensure it is highly detailed.
4. The rewritten ABSTRACT MUST contain a minimum of 130 words.
5. The rewritten DESCRIPTION MUST contain a minimum of 160 words.

NEW FEATURES:
{features_text}

CUSTOM ABSTRACT:
{abstract if abstract else "N/A"}

CUSTOM DESCRIPTION:
{description if description else "N/A"}

OUTPUT FORMAT:

ABSTRACT:
(your rewritten abstract here, or leave empty if N/A)

DESCRIPTION:
(your rewritten description here, or leave empty if N/A)
""".strip()

    raw = generate_text(prompt, task="chat")
    
    return {
        "abstract": extract_section(raw, "ABSTRACT") if abstract else "",
        "description": extract_section(raw, "DESCRIPTION") if description else ""
    }
