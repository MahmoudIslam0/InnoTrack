import re
import json
from src.recommendation_engine.context_builder import extract_domain
from src.recommendation_engine.llm_client import generate_text

def word_to_number(text: str):
    cleaned = text.strip()

    mapping = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
    }

    text = text.lower()

    for word, num in mapping.items():
        if re.search(rf"\b{word}\b", text):
            return num

    nums = re.findall(r'\d+', text)
    if nums:
        return int(nums[0])

    return None

def analyze_user_input(user_input: str, state: dict) -> dict:
    text = user_input.lower()
    
    number = word_to_number(text)

    prompt = f"""
You are the brain of a graduation project assistant. Your job is to evaluate the user's input, manage the conversational state, and decide the next backend action.

Current Conversational State:
- Waiting for domain: {state.get('waiting_for_domain', False)}
- Waiting for project action (features/full project): {state.get('waiting_for_project_action', False)}
- Active project title: {state.get('project_title', 'None')}
- Project chat mode: {state.get('project_chat_mode', False)}

User Input: "{user_input}"

Evaluate the input and choose exactly ONE action from the following list:

1. "reply_directly": Choose this if you want to answer the user directly with conversational text.
    - Use this for general questions (e.g. "what is frontend?", "act as gemini").
    - Use this if the user provides a vague or invalid project title (e.g. "My Project", "Test") and you need to ask them to be more specific.
    - Use this to answer greetings, generic chit-chat, or isolated vague words (e.g. "general", "other", "others"). When answering greetings or vague statements, just ask the user what they mean or how you can help. Do NOT preemptively ask them to select a domain unless they specifically ask for project ideas. Do NOT choose "trigger_idea_generation" for isolated words unless you are actively waiting for a domain.
    - CRITICAL: Use this if the user provides a descriptive project title but DOES NOT explicitly ask to generate features or generate a full project. If they just give a title, put this in "reply_text": "Great project title! Would you like me to 1️⃣ Generate features for it, or 2️⃣ Generate the full project specification?". Also extract the title into "extracted_title".
    - If you choose this, put your conversational response in the "reply_text" field.

2. "trigger_idea_generation": Choose this if the user explicitly asks for project ideas, recommendations, or to explore projects.
    - Example: "Explore AI project ideas", "give me an idea", "Recommend a FinTech project".
    - If they specify a domain (like "AI" or "FinTech"), extract it into "extracted_domain".
    - CRITICAL: If they ask for ideas but do NOT provide a domain (e.g. just "idea"), you MUST STILL choose "trigger_idea_generation". Do NOT choose "reply_directly" to ask for a domain. The system backend will handle asking them.
    - CRITICAL: If `Waiting for domain: True` and the user provides a domain or field (e.g. "Data science", "AI", "other"), you MUST choose "trigger_idea_generation" and extract the domain. Do NOT choose "reply_directly".

3. "trigger_feature_generation": Choose this if the user explicitly asks for features generated AND they have provided a valid, descriptive project title.
    - Example: "Generate features for AI-based library portal", or "1" (if selecting option 1 to improve/generate features).
    - If they ask for features but the title is vague, just a brand name (like "Fixy", "App"), or lacking technical context (like "My Project"), choose "reply_directly" instead. Explain that a brand name isn't enough, and ask for a descriptive, technical title that explains what the project actually does.

4. "trigger_full_project_generation": Choose this if the user wants to generate the complete project specification.
    - Example: "generate full project", "fill all fields", or "2" (if selecting option 2 to generate the full project).

5. "clear_session": Choose this if the user explicitly asks to start over, clear the chat, start a new project, reset the memory, or forget the current project.
    - Example: "restart", "start over", "clear memory", "let's do a different project".

5. "confirmation_yes": Choose this if the user is saying yes/confirming a prompt.
6. "confirmation_no": Choose this if the user is saying no/declining.

CRITICAL INSTRUCTIONS:
- You are the orchestrator. If a request is invalid, missing context, or vague, use "reply_directly" to ask the user to clarify. Do NOT trigger a generation task if the input is bad.
- NEVER choose "trigger_feature_generation" if the project title is just a single word, a brand name, or lacks technical description (e.g. "Fixy", "My Project", "Test"). You MUST choose "reply_directly" and ask the user to provide a descriptive technical title that explains what the system actually does.
- If the user provides a summary or context about their project, extract it into "extracted_abstract". If they provide a detailed breakdown or scope, extract it into "extracted_description".
- Return ONLY a valid JSON object. Do NOT include markdown blocks.

JSON Format:
{{
    "action": "exact_action_name",
    "reply_text": "text to reply to the user (ONLY if action is reply_directly, otherwise null)",
    "extracted_domain": "extract_domain_if_mentioned_else_null",
    "extracted_title": "extract_project_title_if_mentioned_else_null",
    "extracted_abstract": "extract_abstract_if_user_provides_one_else_null",
    "extracted_description": "extract_description_if_user_provides_one_else_null"
}}
"""
    try:
        raw_response = generate_text(prompt, task="intent").strip()
        
        # Extract JSON using regex if there's conversational text
        import re
        json_match = re.search(r'(\{.*\})', raw_response, re.DOTALL)
        if json_match:
            raw_response = json_match.group(1)
        else:
            raw_response = raw_response.strip()
            
        parsed = json.loads(raw_response)
        import logging
        logging.info(f"DEBUG LLM ROUTER PARSED: {parsed}")
        
        action = parsed.get("action", "reply_directly")
        reply_text = parsed.get("reply_text")
        domain = parsed.get("extracted_domain") or extract_domain(text)
        project_title = parsed.get("extracted_title")
        abstract = parsed.get("extracted_abstract")
        description = parsed.get("extracted_description")
        
        return {
            "action": action,
            "reply_text": reply_text,
            "domain": domain,
            "project_title": project_title,
            "abstract": abstract,
            "description": description,
            "number": number
        }
    except Exception as e:
        import logging
        logging.error(f"DEBUG LLM ROUTER EXCEPTION: {e}")
        # Fallback
        domain = extract_domain(text)
        action = "reply_directly"
        reply_text = None
        project_title = None
        abstract = None
        description = None
            
        return {
            "action": action,
            "reply_text": reply_text,
            "domain": domain,
            "project_title": project_title,
            "abstract": abstract,
            "description": description,
            "number": number
        }
