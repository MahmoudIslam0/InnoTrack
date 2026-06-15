import time
import logging
from typing import List

from google import genai

from src.recommendation_engine.config import (
    GEMINI_API_KEY,
    MODEL_CANDIDATES,
    IDEA_TEMPERATURE,
    FEATURE_TEMPERATURE,
    CHAT_TEMPERATURE,
    INTENT_TEMPERATURE,
    IDEA_MAX_TOKENS,
    FEATURE_MAX_TOKENS,
    CHAT_MAX_TOKENS,
    INTENT_MAX_TOKENS,
    FULL_PROJECT_MAX_TOKENS,
    TOP_P,
    TOP_K,
    MAX_RETRIES,
    RETRY_DELAY_SECONDS,
    ENABLE_LOGGING
)

from src.recommendation_engine.validator import validate_generated_list

logger = logging.getLogger(__name__)

if ENABLE_LOGGING:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s"
    )

class LLMProviderError(Exception):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

def classify_provider_error(error: Exception):
    text = str(error).lower()

    if (
        "reported as leaked" in text
        or "permission_denied" in text
        or "api key" in text
        or "403" in text
    ):
        return LLMProviderError(
            "Gemini API key was rejected. Create a new key, update .env, and restart the server.",
            status_code=503
        )

    if (
        "resource_exhausted" in text
        or "quota" in text
        or "rate limit" in text
        or "429" in text
    ):
        return LLMProviderError(
            "Gemini quota or rate limit is exhausted. Try again later or use another API key/project.",
            status_code=429
        )

    return None

client = genai.Client(api_key=GEMINI_API_KEY)

def extract_text(response) -> str:

    if not response:
        return ""

    
    text = getattr(response, "text", None)
    if text:
        return text.strip()

    
    try:
        candidates = getattr(response, "candidates", [])
        if candidates:
            parts = candidates[0].content.parts
            return " ".join(
                p.text for p in parts if hasattr(p, "text")
            ).strip()
    except Exception:
        pass

    return ""

def get_temperature(task: str) -> float:

    return {
        "idea": IDEA_TEMPERATURE,
        "feature": FEATURE_TEMPERATURE,
        "intent": INTENT_TEMPERATURE,
    }.get(task, CHAT_TEMPERATURE)

def get_max_tokens(task: str) -> int:

    return {
        "idea": IDEA_MAX_TOKENS,
        "feature": FEATURE_MAX_TOKENS,
        "intent": INTENT_MAX_TOKENS,
        "full_project": FULL_PROJECT_MAX_TOKENS,
    }.get(task, CHAT_MAX_TOKENS)

def safe_prompt(prompt: str, max_chars: int = 12000) -> str:
    return prompt[-max_chars:]

def is_bad_response(text: str) -> bool:

    if not text:
        return True

    text = text.strip()

    
    if len(text) < 3:
        return True

    
    bad_phrases = [
        "as an ai",
        "i can help you",
        "let me know"
    ]

    lower = text.lower()

    if all(p in lower for p in bad_phrases):
        return True

    return False

def generate_text(
    prompt: str,
    task: str = "chat",
    temperature=None
) -> str:

    prompt = safe_prompt(prompt)

    if temperature is None:
        temperature = get_temperature(task)
    max_tokens = get_max_tokens(task)

    for model_name in MODEL_CANDIDATES:

        for attempt in range(MAX_RETRIES):

            try:
                logger.info(
                    f"[LLM] model={model_name} | task={task} | attempt={attempt+1}"
                )

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "temperature": temperature,
                        "top_p": TOP_P,
                        "top_k": TOP_K,
                        "max_output_tokens": max_tokens
                    }
                )

                text = extract_text(response)

                
                if is_bad_response(text):
                    logger.warning("[LLM] Weak response, using anyway")
                    return text  

                return text

            except Exception as e:
                logger.warning(f"[LLM ERROR] {e}")

                provider_error = classify_provider_error(e)
                if provider_error:
                    if provider_error.status_code == 429 and attempt < MAX_RETRIES - 1:
                        sleep_time = (RETRY_DELAY_SECONDS * 5) * (attempt + 1)
                        logger.info(f"[LLM 429] Rate limited. Retrying in {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                    raise provider_error

                
                time.sleep(RETRY_DELAY_SECONDS * (attempt + 1))

        logger.info(f"[LLM] switching model...")

    logger.error("All LLM models failed")

    return ""

def generate_list(prompt: str, task="chat") -> List[str]:

    text = generate_text(prompt, task=task)

    return validate_generated_list(text)
