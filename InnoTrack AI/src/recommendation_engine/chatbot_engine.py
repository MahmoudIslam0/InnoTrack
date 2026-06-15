from src.recommendation_engine.memory_store import (
    get_user_memory,
    save_user_memory,
    default_state
)

from src.recommendation_engine.llm_router import analyze_user_input

from src.recommendation_engine.command_handler import (
    is_command,
    handle_command
)

from src.recommendation_engine.idea_generator import generate_ideas
from src.recommendation_engine.feature_generator import generate_features

from src.recommendation_engine.llm_client import generate_text, generate_list
from src.recommendation_engine.prompt_builder import build_chat_prompt, build_niche_domains_prompt
from src.recommendation_engine.response_formatter import format_response
from src.recommendation_engine.state_manager import update_state
from src.recommendation_engine.context_builder import extract_domain, DOMAIN_KEYWORDS

from src.recommendation_engine.full_project_generator import (
    generate_full_project
)

import re

# ─────────────────────────────────────────────
#  Project Idea Validator + Categorizer
# ─────────────────────────────────────────────
def validate_and_categorize_project(title: str, abstract: str = "") -> dict:
    """
    Uses Gemini to:
    1. Verify whether the title is a valid graduation project idea.
    2. Assign it to the best-matching domain from the known list.

    Returns:
        {
            "is_valid": bool,
            "domain": str | None,
            "reason": str
        }
    """
    known_domains = [d for d in DOMAIN_KEYWORDS.keys() if d != "Others"]
    domain_list_str = "\n".join(f"- {d}" for d in known_domains)

    prompt = f"""
You are an expert academic advisor evaluating graduation project ideas.

Project Title: "{title}"
{"Abstract: " + abstract[:400] if abstract else ""}

Task 1 – Validity Check:
Is this a valid, feasible graduation project idea for a university student?
- It must be a technical or academic topic (not a random phrase, celebrity name, or nonsense)
- It should be specific enough to build something real
Answer: YES or NO

Task 2 – Domain Classification:
If valid, which ONE of the following domains best fits this project?
{domain_list_str}

Return your answer in this EXACT format (two lines only):
VALID: YES
DOMAIN: <domain name from the list above>

If invalid:
VALID: NO
DOMAIN: None
REASON: <one sentence why>
"""
    try:
        raw = generate_text(prompt, task="intent").strip()
        lines = {line.split(":", 1)[0].strip().upper(): line.split(":", 1)[1].strip()
                 for line in raw.splitlines() if ":" in line}

        is_valid = lines.get("VALID", "NO").upper() == "YES"
        domain = lines.get("DOMAIN", "").strip()
        reason = lines.get("REASON", "")

        if domain == "None" or domain not in known_domains:
            domain = None
        return {"is_valid": is_valid, "domain": domain, "reason": reason}

    except Exception:
        return {"is_valid": True, "domain": None, "reason": ""}


def extract_number(text: str, default=5):
    cleaned = str(text).strip()
    if cleaned in ["1", "2"]:
        return default
    nums = re.findall(r"\d+", text)
    return min(int(nums[0]), 20) if nums else default

def validate_and_format_domain(domain: str) -> str:
    # 1. Quick local validation for standard domains
    extracted = extract_domain(domain)
    if extracted and extracted.lower() != "others":
        return extracted

    # 2. Fall back to LLM validation
    prompt = f"""
Determine if the following domain/field is a valid academic, engineering, scientific, or technology domain suitable for a university graduation project (e.g., Computer Science, Engineering, Medicine, Business, Agriculture, Biology, etc.).
Also, correct any typos and format it cleanly (e.g., Title Case).

Domain to evaluate: "{domain}"

Rules:
- If it is a valid field of study, technology, or academic discipline (e.g., "artificial intelligence", "robotics", "bioinformatics", "educational games"), return ONLY the corrected and formatted domain name (e.g., "Artificial Intelligence").
- If it is unrelated to academic/technology graduation projects, or contains names of celebrities, sports teams, food, pop culture, or random questions (e.g., "messi", "fc barcelona", "pizza", "what is this"), return exactly "INVALID".

Return ONLY the formatted domain name or "INVALID". Do not include any other text.
"""
    try:
        res = generate_text(prompt, task="intent").strip()
        if not res or res.upper() == "INVALID":
            return ""
        return res.strip('"').strip("'")
    except Exception:
        return ""

def is_weak_project_title(title: str) -> bool:

    if not title:
        return True

    title = title.strip()

    words = title.split()

    
    if len(words) < 4:
        return True

    weak_words = {
        "system",
        "platform",
        "app",
        "website",
        "application",
        "project",
        "ai",
        "smart",
        "tool"
    }

    meaningful = [
        w.lower()
        for w in words
        if w.lower() not in weak_words
    ]

    return len(words) < 3

def is_generic_project_reference(text: str) -> bool:

    text = text.strip().lower()

    generic_titles = {
        "my project",
        "this project",
        "the project",
        "my system",
        "this system",
        "my app",
        "my application",
        "my idea",
        "project",
        "system",
        "app",
        "idea"
    }

    return text in generic_titles

def looks_like_real_project_title(title: str) -> bool:

    if not title:
        return False

    title = title.strip()

    words = title.split()

    
    if len(words) < 2:
        return False

    
    unique_ratio = len(set(words)) / len(words)

    if unique_ratio < 0.5:
        return False

    
    nonsense_patterns = [
        "asd",
        "qwe",
        "zxc",
        "testtest",
        "aaaa",
        "xxxxx"
    ]

    lowered = title.lower()

    question_starts = (
        "how ",
        "what ",
        "why ",
        "when ",
        "where ",
        "can ",
        "could ",
        "should ",
        "is ",
        "are ",
        "do ",
        "does "
    )

    for qs in question_starts:
        if lowered.startswith(qs):
            return False

    for p in nonsense_patterns:
        if p in lowered:
            return False

    
    keywords = {

    
    "management",
    "analysis",
    "detection",
    "tracking",
    "recognition",
    "monitoring",
    "security",
    "attendance",
    "automation",
    "prediction",
    "dashboard",
    "diagnosis",
    "learning",
    "recommendation",
    "classification",
    "authentication",
    "optimization",

    
    "healthcare",
    "fintech",
    "education",
    "library",
    "hospital",
    "school",
    "medical",
    "industrial",
    "agriculture",
    "transport",

    
    "ai",
    "iot",
    "blockchain",
    "cloud",
    "robotics",
    "vision",
    "embedded",

    
    "system",
    "platform",
    "application",
    "app",
    "website",
    "portal",
    "tool",
    "game",
    "generator",
    "engine",
    "software",
    "database",
    "model",
    "chatbot",
    "chat",
    "assistant",
    "network",
    "api",
    "mobile",
    "web",
    "smart"
}

    if not any(
        k in lowered
        for k in keywords
    ):
        return False

    return True

FOLLOWUP_WORDS = [
    "another",
    "more",
    "again",
    "other ideas",
    "more ideas",
    "more features",
    "another features"
]

def finalize_response(
    user_input,
    response,
    history,
    state,
    user_id
):

    history.append({
        "role": "user",
        "content": user_input
    })

    history.append({
        "role": "assistant",
        "content": response
    })

    history = history[-20:]

    save_user_memory(user_id, {
        "history": history,
        "state": state
    })

    return response

def is_gibberish_text(text: str) -> bool:

    text = text.strip().lower()

    
    if text in {"1", "2", "3"}:
        return False

    
    if len(text) < 3:

        
        allowed_short = {
            "hi",
            "hey",
            "hello",
            "ai",
            "ml",
            "ui",
            "ux",
            "vr",
            "ar",
            "iot",
            "no",
            "la",
            "n",
            "y",
            "ok"
        }

        if text in allowed_short:
            return False

        return True

    gibberish_patterns = [
        "asd",
        "qwe",
        "zxc",
        "aaa",
        "bbb",
        "ccc",
        "xxx",
        "testtest"
    ]

    for p in gibberish_patterns:
        if p in text:
            return True

    words = text.split()

    
    if len(words) >= 3:

        unique_ratio = len(set(words)) / len(words)

        if unique_ratio < 0.5:
            return True

    return False

def is_project_related(text: str) -> bool:

    text = text.lower().strip()

    keywords = [

        
        "project",
        "system",
        "platform",
        "application",
        "app",
        "website",
        "dashboard",
        "management",

        
        "ai",
        "ml",
        "machine learning",
        "deep learning",
        "computer vision",
        "blockchain",
        "iot",
        "web",
        "mobile",
        "cloud",
        "security",
        "database",
        "api",

        
        "generate",
        "feature",
        "features",
        "idea",
        "ideas",
        "improve",
        "description",
        "technologies",
        "architecture",

        
        "healthcare",
        "education",
        "fintech",
        "smart",
        "attendance",
        "monitoring",
        "tracking",
        "analysis",
        "recognition"
    ]

    return any(
        keyword in text
        for keyword in keywords
    )

def is_general_question_or_unrelated_chat(text: str) -> bool:
    lowered = text.strip().lower()
    
    # Ends with question mark
    if lowered.endswith("?"):
        return True
        
    # Starts with common question words
    question_starts = (
        "how ", "what ", "why ", "when ", "where ", "can ", "could ", "should ", 
        "is ", "are ", "do ", "does ", "explain ", "tell me ", "show me ", "describe "
    )
    if lowered.startswith(question_starts):
        return True
        
    # Contains common question phrases
    question_phrases = (
        "what is", "what's", "tell me about", "can you", "could you", "how to", "how do"
    )
    if any(phrase in lowered for phrase in question_phrases):
        return True
        
    return False


def chatbot(user_id: str, user_input: str):
    text = user_input.lower().strip()

    if is_command(user_input):
        return handle_command(user_input)

    memory = get_user_memory(user_id)
    history = memory.get("history", [])
    state = memory.get("state") or default_state()

    # The Orchestrator handles all context and validation
    from src.recommendation_engine.llm_router import analyze_user_input
    analysis = analyze_user_input(user_input, state)
    
    action = analysis.get("action", "reply_directly")
    reply_text = analysis.get("reply_text")
    domain = analysis.get("domain")
    project_title = analysis.get("project_title")
    number = analysis.get("number")
    abstract = analysis.get("abstract")
    description = analysis.get("description")

    if action == "reply_directly":
        if project_title and not state.get("project_title"):
            state["project_title"] = project_title
        if domain and not state.get("domain"):
            state["domain"] = domain
            
        custom_saved = False
        if abstract:
            state["abstract"] = abstract
            state["custom_abstract"] = True
            custom_saved = True
        if description:
            state["description"] = description
            state["custom_description"] = True
            custom_saved = True
            
        save_user_memory(user_id, {"history": history, "state": state})
        
        final_reply = reply_text or "I didn't quite catch that. Can you clarify?"
        if custom_saved:
            final_reply = "✅ I have saved your custom project details!\n\n" + final_reply
            
        return finalize_response(
            user_input,
            final_reply,
            history,
            state,
            user_id
        )

    elif action == "trigger_idea_generation":
        if domain:
            domain_lower = domain.lower()
            if domain_lower in ["other", "others", "general", "any"]:
                state["domain"] = "general"
                state["waiting_for_domain"] = False
            elif domain_lower in ["domain", "domains", "list", "options", "help"]:
                state["domain"] = None
            else:
                state["domain"] = domain
                state["waiting_for_domain"] = False
        elif not any(w in user_input.lower() for w in FOLLOWUP_WORDS):
            state["domain"] = None
            
        if not state.get("domain"):
             state["waiting_for_domain"] = True
             save_user_memory(user_id, {"history": history, "state": state})
             domain_list = "\n".join(f"- {d}" for d in DOMAIN_KEYWORDS.keys() if d != "Others")
             response = (
                f"Which domain is your project in? 📚\n\n"
                f"{domain_list}\n\n"
                f"💡 Just type one of the domains above (e.g. **AI** or **Healthcare**)\n"
                f"If your domain isn't listed, type **Others** to see more options."
             )
             return finalize_response(user_input, response, history, state, user_id)

        top_k = number or extract_number(user_input, 5)

        all_past_ideas = state.get("all_generated_ideas", [])
        if state.get("ideas"):
            for i in state["ideas"]:
                if i not in all_past_ideas:
                    all_past_ideas.append(i)

        result = generate_ideas(
            domain=state.get("domain"),
            top_k=top_k,
            previous_generated_ideas=all_past_ideas
        )

        ideas = result.get("final_ideas", [])

        state["all_generated_ideas"] = all_past_ideas + ideas
        state["ideas"] = ideas
        state["last_action"] = "idea"
        
        state["project_title"] = ""
        state["features"] = []
        state["all_generated_features"] = []
        state["description"] = ""
        state["abstract"] = ""
        state["technologies"] = []

        response = format_response("idea", "", state)
        return finalize_response(user_input, response, history, state, user_id)

    elif action == "trigger_feature_generation":
        if project_title:
            state["project_title"] = project_title

        if not state.get("project_title"):
            return finalize_response(
                user_input,
                "I need a project title to generate features! 📝\nJust type your project title.",
                history,
                state,
                user_id
            )

        top_k = number or extract_number(user_input, 5)

        all_past_features = state.get("all_generated_features", [])
        if state.get("features"):
            for f in state["features"]:
                if f not in all_past_features:
                    all_past_features.append(f)

        result = generate_features(
            title=state.get("project_title"),
            description=state.get("description", ""),
            features=[],
            previous_generated_features=all_past_features,
            top_k=top_k
        )

        new_features = result.get("recommended_features", [])
        
        state["all_generated_features"] = all_past_features + new_features
        state["features"] = new_features
        state["last_action"] = "feature"

        response = format_response("feature", "", state)
        
        if state.get("custom_abstract") or state.get("custom_description"):
            state["waiting_for_abstract_update"] = True
            response += "\n\n✨ **Would you like me to seamlessly weave these new features into your custom abstract and description? (Yes/No)**"
            
        return finalize_response(user_input, response, history, state, user_id)

    elif action == "trigger_full_project_generation":
        if project_title:
            state["project_title"] = project_title
            
        if not state.get("features"):
            feature_result = generate_features(
                title=state.get("project_title"),
                description=state.get("description", ""),
                features=[],
                previous_generated_features=[],
                top_k=8
            )
            state["features"] = feature_result.get("recommended_features", [])

        custom_desc = state.get("custom_description", False)
        custom_abs = state.get("custom_abstract", False)

        result = generate_full_project(
            title=state.get("project_title"),
            features=state.get("features", []),
            description=state.get("description", "") if custom_desc else "",
            abstract=state.get("abstract", "") if custom_abs else "",
            custom_description=custom_desc,
            custom_abstract=custom_abs
        )

        state = update_state(state, result, mode="merge")
        if state.get("domain"):
            state["category"] = state.get("domain")

        response = f"""
📦 Full Project Generated

📌 Project Title:
{state.get("project_title")}

📂 Category:
{state.get("category")}

🛠 Technologies:
{", ".join(state.get("technologies", []))}

📄 Abstract:
{state.get("abstract")}

📄 Detailed Description:
{state.get("description")}

❗ Problem Statement:
{state.get("problem_statement")}

💡 Proposed Solution:
{state.get("proposed_solution")}

🎯 Objectives:
{chr(10).join("- " + x for x in state.get("objectives", []))}

━━━━━━━━━━━━━━━━━━━━━━
👉 What's next? You can say "improve features", or tell me to "replace abstract with..." your own custom text!
"""
        return finalize_response(user_input, response, history, state, user_id)
        
    elif action == "confirmation_yes":
        if state.get("waiting_for_abstract_update"):
            from src.recommendation_engine.full_project_generator import rewrite_custom_sections
            state["waiting_for_abstract_update"] = False
            
            rewritten = rewrite_custom_sections(
                features=state.get("features", []),
                abstract=state.get("abstract", "") if state.get("custom_abstract") else "",
                description=state.get("description", "") if state.get("custom_description") else ""
            )
            
            if state.get("custom_abstract") and rewritten.get("abstract"):
                state["abstract"] = rewritten["abstract"]
            if state.get("custom_description") and rewritten.get("description"):
                state["description"] = rewritten["description"]
                
            save_user_memory(user_id, {"history": history, "state": state})
            return finalize_response(
                user_input, 
                "✅ **Done!** I've upgraded your custom abstract and description with the new features while keeping your original style intact.\n\nType **'2'** to generate and view your newly upgraded full project!", 
                history, 
                state, 
                user_id
            )
            
        state["waiting_for_project_idea_confirm"] = False
        state["waiting_for_title_confirmation"] = False
        save_user_memory(user_id, {"history": history, "state": state})
        return finalize_response(user_input, "Great! Confirmed. Let's move on.", history, state, user_id)
        
    elif action == "confirmation_no":
        if state.get("waiting_for_abstract_update"):
            state["waiting_for_abstract_update"] = False
            save_user_memory(user_id, {"history": history, "state": state})
            return finalize_response(
                user_input, 
                "👍 **Got it!** I will leave your custom abstract and description exactly as you wrote them.\n\nType **'2'** whenever you're ready to view the full project.", 
                history, 
                state, 
                user_id
            )
            
        state["waiting_for_project_idea_confirm"] = False
        state["waiting_for_title_confirmation"] = False
        save_user_memory(user_id, {"history": history, "state": state})
        return finalize_response(user_input, "No problem! Let's try something else.", history, state, user_id)
        
    elif action == "clear_session":
        state = default_state()
        save_user_memory(user_id, {"history": history, "state": state})
        return finalize_response(
            user_input,
            "✅ Session cleared! We are starting fresh. How can I help you today?",
            history,
            state,
            user_id
        )

    else:
        return finalize_response(user_input, "I am not sure how to handle that.", history, state, user_id)
