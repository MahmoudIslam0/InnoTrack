from typing import Dict, Any, List

def list_to_text(items: List[str], max_items: int = 10) -> str:

    if not items:
        return "None"

    seen = set()
    cleaned = []

    for item in items[:max_items]:

        val = str(item).strip()

        if not val:
            continue

        key = val.lower()

        if key not in seen:
            seen.add(key)
            cleaned.append(val)

    return ", ".join(cleaned)

def build_feature_prompt(
    context: Dict[str, Any],
    count: int = 10,
    previous_features: List[str] = None
) -> str:

    previous_features = previous_features or []

    return f"""
You are a senior software architect and AI systems designer.

TASK:
Generate {count} intelligent and realistic system features
for the following graduation project.

PROJECT TITLE:
{context.get("project_title")}

CURRENT FEATURES:
{list_to_text(context.get("features", []), 15)}

COMMON OVERUSED FEATURES TO AVOID:
{list_to_text(context.get("common_features", []), 15)}

PREVIOUSLY GENERATED FEATURES:
{list_to_text(previous_features, 20)}

PROJECT CONTEXT:
- Originality Score: {context.get("originality_score", 1.0)}
- Context Strength: {context.get("context_strength", 0.0)}

IMPORTANT REQUIREMENTS:
- Generate ONLY additional features.
- Do NOT rewrite or rephrase existing features.
- Do NOT generate semantic variations.
- Each new feature must introduce a new capability.
- Focus on originality expansion.
- Features must belong to ONE coherent system
- Features must solve REAL problems
- Prefer intelligent automation and AI logic
- Focus on implementable engineering features
- Avoid vague or generic functionality
- Avoid simple CRUD/dashboard/login features
- Generate diverse feature types

FEATURE TYPES TO MIX:
- Core system features
- AI/smart features
- Automation features
- Analytics/monitoring features
- Reliability/safety features
- User experience improvements

STRICT RULES:
- One feature per line
- No numbering
- No explanations
- No repeated concepts
- Each feature should be concise
- Each feature should sound like a real product capability
- Prefer 3–10 words per feature

GOOD FEATURE EXAMPLES:
- Real-time gesture recognition
- Predictive patient risk analysis
- AI-assisted diagnosis support
- Emergency response prioritization
- Adaptive learning recommendation engine

BAD FEATURE EXAMPLES:
- Smart dashboard
- AI module
- Login system
- Reports page
- User management

OUTPUT:
""".strip()

def build_niche_domains_prompt(previous_domains: List[str] = None) -> str:
    previous_domains = previous_domains or []
    prev_text = list_to_text(previous_domains, 20)
    return f"""
You are an AI innovation consultant.
Generate 5 highly niche, unusual, and cutting-edge domains for graduation projects.
Avoid standard domains like: AI, Machine Learning, Healthcare, Finance, Education, CyberSecurity, Cloud, E-Commerce, IoT.

PREVIOUSLY SUGGESTED (DO NOT REPEAT THESE):
{prev_text}

Give me just the names of the domains, one per line.
Keep them concise (2-4 words).
Example:
- Quantum Cryptography
- Deep Sea Robotics
- Cognitive Brain-Computer Interfaces
""".strip()

def build_idea_prompt(
    context: Dict[str, Any],
    count: int = 10,
    previous_ideas: List[str] = None
) -> str:

    previous_ideas = previous_ideas or []

    domain = context.get("domain", "general")
    existing_titles = context.get("existing_titles", [])

    return f"""
You are a senior AI innovation consultant.

TASK:
Generate {count} HIGHLY ORIGINAL (85% to 99% Originality) and unique graduation project ideas.
The ideas MUST NOT duplicate or be variants of existing database projects or typical student projects.

DOMAIN:
{domain}

EXISTING PROJECTS IN THE DATABASE (DO NOT REPEAT OR DUPLICATE THESE):
{list_to_text(existing_titles, 15)}

PREVIOUS IDEAS SUGGESTED IN THIS SESSION (DO NOT REPEAT THESE):
{list_to_text(previous_ideas, 20)}

IMPORTANT REQUIREMENTS:
- Originality & Feasibility Balance: Ideas must possess HIGH ORIGINALITY, but must be highly feasible and implementable. They should be realistic software or software-hardware projects that undergraduate students can build within 6–9 months.
- Avoid PhD-level, highly theoretical, or "impossible" sci-fi research topics (e.g. do NOT require quantum computing, non-existent sensors, or highly experimental brain-computer interfaces).
- Ideas must solve REAL problems using cutting-edge, yet practical and available technologies (such as standard web/mobile frameworks, existing ML models, APIs, and affordable IoT hardware).
- Avoid generic software projects or standard web/mobile applications that lack intelligence.
- Prefer smart AI integrations (LLMs, Computer Vision, specialized ML models), advanced automation, or intelligent systems.
- Each idea must represent a COMPLETELY DIFFERENT concept.

STRICT RULES:
- No repeated concepts or slight rewording of existing projects.
- Avoid overused ideas like: standard prediction models, generic recommendation engines, basic management dashboards, IoT plant watering, face recognition attendance, or smart traffic lights.
- Push the boundaries of the selected domain to ensure maximum uniqueness without losing feasibility.

FORMAT RULES:
- One idea per line
- No numbering
- No explanations
- Keep each idea concise
- Prefer 4–12 words

GOOD IDEA EXAMPLES:
- AI-powered agricultural crop disease detection via mobile app and offline edge-inference
- Blockchain-secured digital academic certificate issuance and verification portal
- AR-based indoor navigation assistant for visually impaired university students
- Smart waste sorting bin using computer vision and mechanical sorting
- Decentralized federated learning for collaborative medical image classification

BAD IDEA EXAMPLES:
- AI management system
- Smart dashboard platform
- Disease prediction using machine learning
- Recommendation application

OUTPUT:
""".strip()

def build_description_prompt(context: Dict[str, Any]) -> str:

    return f"""
You are a senior technical writer and software architect.

TASK:
Write a professional graduation project description.

PROJECT TITLE:
{context.get("project_title")}

FEATURES:
{list_to_text(context.get("features", []), 20)}

REQUIREMENTS:
- Explain the real-world problem
- Explain the proposed solution
- Connect all features logically
- Explain system intelligence and AI usage
- Keep the description realistic and implementable
- Write clearly and professionally
- Avoid unnecessary marketing language
- The description MUST be highly detailed and contain a minimum of 160 words.

STRUCTURE:
1. Problem
2. Solution
3. System capabilities
4. Expected impact

OUTPUT:
Professional structured paragraph
""".strip()

def build_chat_prompt(context: Dict[str, Any]) -> str:

    return f"""
You are a senior software architect and graduation project consultant.

PROJECT TITLE:
{context.get("project_title", "None")}

PROJECT DESCRIPTION:
{context.get("description", "None")}

PROJECT FEATURES:
{list_to_text(context.get("features", []), 20)}

TECHNOLOGIES:
{list_to_text(context.get("technologies", []), 20)}

YOUR ROLE:
- Help improve the graduation project
- Suggest technical improvements
- Answer project-related questions
- Keep responses professional and practical
- Focus on software engineering and AI systems
- Avoid unrelated discussions

RULES:
- Be concise
- Be realistic
- Be technically accurate
- Keep all answers related to the current project
- STRICTLY REFUSE to discuss any illegal, inappropriate, explicit (e.g., sexual content), or unethical topics. If the user mentions such topics, reply immediately with a professional warning that you can only discuss academic graduation projects.
""".strip()

def build_full_project_prompt(context):

    title = context.get("project_title", "")

    features = context.get("features", [])

    description = context.get("description", "")

    abstract = context.get("abstract", "")

    features_text = "\n".join(
        f"- {f}"
        for f in features
    )

    return f"""
You are a senior software architect and academic researcher.

Generate a COMPLETE graduation project specification.

====================================================

PROJECT TITLE:
{title}

CURRENT ABSTRACT:
{abstract}

CURRENT DESCRIPTION:
{description}

FEATURES:
{features_text}

====================================================

STRICT RULES:

1. Return ALL sections
2. NEVER skip any section
3. NEVER leave any field empty
4. If information is missing, intelligently generate it
5. Use professional academic style
6. IF CURRENT ABSTRACT or CURRENT DESCRIPTION is provided, you MUST use their core concepts but seamlessly REWRITE and EXPAND them to explicitly include all the new FEATURES. DO NOT just copy them, and DO NOT ignore them. They represent the user's custom baseline intent.
6. Technologies and lists MUST use bullet points
7. Use EXACT section names
8. No explanations outside sections
9. Every section must contain meaningful content
10. OBJECTIVES must contain at least 5 objectives
11. FUTURE_WORK must contain at least 4 items
12. KEYWORDS must contain at least 5 keywords
13. TECHNOLOGIES must contain at least 5 technologies
14. METHODOLOGY must be detailed and multi-step
15. AI_SUMMARY must never be empty
16. The ABSTRACT section MUST be highly detailed and contain a minimum of 130 words.
17. The DESCRIPTION section MUST be highly detailed and contain a minimum of 160 words.

====================================================

CATEGORY:
(short category)

ABSTRACT:
(full academic abstract. CRITICAL RULE: If a CURRENT ABSTRACT was provided above, you MUST base this entirely around that custom text and seamlessly integrate the FEATURES into it. Do not ignore the custom text!)

DESCRIPTION:
(full detailed description. CRITICAL RULE: If a CURRENT DESCRIPTION was provided above, you MUST base this entirely around that custom text and seamlessly integrate the FEATURES into it. Do not ignore the custom text!)

TECHNOLOGIES:
- item
- item
- item

KEYWORDS:
- keyword
- keyword
- keyword

PROBLEM_STATEMENT:
(real-world problem explanation)

PROPOSED_SOLUTION:
(system solution explanation)

OBJECTIVES:
- objective
- objective
- objective

AI_SUMMARY:
(short AI-generated summary)

FUTURE_WORK:
- future enhancement
- future enhancement

METHODOLOGY:
(step-by-step implementation process)
""".strip()
