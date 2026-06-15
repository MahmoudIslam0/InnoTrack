from src.recommendation_engine.llm_client import generate_text

VALID_INTENTS = {
    "idea",
    "feature",
    "full_project",
    "chat"
}

def detect_intent_semantic(user_input: str, state: dict) -> str:

    prompt = f"""
You are an intent classifier for a graduation project assistant.

Classify the user intent into ONE of these:
idea
feature
description
full_project
chat

================ CONTEXT =================
Current Project Title:
{state.get("project_title") or "None"}

Has Features:
{"yes" if state.get("features") else "no"}

Has Description:
{"yes" if state.get("description") else "no"}

================ USER =================
"{user_input}"

================ RULES =================
- Asking for project ideas → idea
- Asking for another/new idea → idea
- Providing a project idea → feature
- Asking for features → featuregenerate features
- Asking for full project / full details → full_project
- If unclear → chat

IMPORTANT:
Return ONLY ONE WORD from the list.
"""

    result = generate_text(prompt, task="intent").lower().strip()

    
    
    
    result = result.split()[0].strip()

    if result in VALID_INTENTS:
        return result

    
    
    
    text = user_input.lower()

    if any(w in text for w in ["idea", "project", "suggest"]):
        return "idea"

    if any(w in text for w in ["feature"]):
        return "feature"

    if any(w in text for w in ["full", "all details", "complete"]):
        return "full_project"

    return "chat"
