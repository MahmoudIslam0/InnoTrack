import re
from typing import List

GENERIC_PATTERNS = [
    "dashboard",
    "login",
    "signup",
    "authentication",
    "admin panel",
    "analytics system",
    "analytics platform",
    "management system",
    "tracking system",
    "monitoring system",
    "ai module",
    "smart system",
    "web platform",
    "mobile app",
    "website",
    "reports page",
    "user management"
]

BAD_STARTS = [
    "here are",
    "below are",
    "these are",
    "the following",
    "project ideas",
    "features include"
]

LOW_VALUE_WORDS = [
    "system",
    "platform",
    "application",
    "website",
    "solution"
]

def clean_text(text: str) -> str:

    if not text:
        return ""

    text = str(text).strip()

    
    text = re.sub(r"^\d+[\)\.\-\s]+", "", text)

    
    text = re.sub(r"^[\-\*\•\→\▪\s]+", "", text)

    
    text = text.replace("**", "")

    
    text = text.replace('"', "").replace("'", "")

    
    text = re.sub(r"\(.*?\)", "", text)

    
    if ":" in text and len(text.split()) > 6:
        text = text.split(":")[0]

    
    text = re.sub(r"^(assistant|bot)\s*[:\-]\s*", "", text, flags=re.I)

    
    text = re.sub(r"[.,\-:;]+$", "", text)

    
    text = re.sub(r"\s+", " ", text).strip()

    return text

def normalize_key(text: str) -> str:

    text = text.lower()

    text = re.sub(r"[^a-z0-9\s]", "", text)

    text = re.sub(r"\s+", " ", text).strip()

    return text

def is_generic(text: str) -> bool:

    low = normalize_key(text)

    for pattern in GENERIC_PATTERNS:
        if pattern in low:
            return True

    return False

def is_low_quality(text: str) -> bool:

    low = normalize_key(text)

    words = low.split()

    
    if len(words) < 3:
        return True

    
    if len(words) > 12:
        return True

    
    if any(low.startswith(x) for x in BAD_STARTS):
        return True

    
    weak_count = sum(
        1 for w in words
        if w in LOW_VALUE_WORDS
    )

    if weak_count >= len(words) / 2:
        return True

    return False

def is_valid_item(text: str) -> bool:

    if not text:
        return False

    
    if is_generic(text):
        return False

    
    if is_low_quality(text):
        return False

    return True

def filter_items(items: List[str]) -> List[str]:

    final = []

    seen = set()

    for item in items:

        text = clean_text(item)

        if not text:
            continue

        if not is_valid_item(text):
            continue

        key = normalize_key(text)

        
        if key in seen:
            continue

        
        duplicate = False

        for old in seen:

            
            overlap = set(key.split()) & set(old.split())

            if len(overlap) >= max(2, min(len(key.split()), len(old.split())) - 1):
                duplicate = True
                break

        if duplicate:
            continue

        seen.add(key)

        final.append(text)

    return final

def smart_split(text: str) -> List[str]:

    if not text:
        return []

    text = text.replace("\r", "\n")

    lines = []

    for line in text.split("\n"):

        line = line.strip()

        if not line:
            continue

        
        parts = re.split(r"\d+[\.\)]\s*", line)

        for p in parts:

            p = p.strip()

            if not p:
                continue

            # Remove leading bullets or hyphens instead of splitting the whole string
            p = re.sub(r"^[-•▪*]\s*", "", p).strip()

            if p:
                lines.append(p)

    return lines

def validate_generated_list(
    text: str,
    top_k: int = 10
) -> List[str]:

    if not text:
        return []

    raw_items = smart_split(text)

    cleaned = filter_items(raw_items)

    return cleaned[:top_k]
