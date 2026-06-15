import re

def is_command(text: str) -> bool:
    """
    Detect if input is a system/terminal command
    """

    if not text:
        return False

    text = text.strip().lower()

    
    
    
    if text in {"exit", "quit", "clear"}:
        return True

    
    
    
    command_patterns = [
        r"^python\s+\S+\.py",          
        r"^pip\s+install",            
        r"^npm\s+install",            
        r"^node\s+\S+",               
        r"^cd\s+.+",                  
        r"^ls\b",                     
        r"^dir\b",                    
        r"^git\s+.+",                 
        r"^sudo\s+.+",                
        r".+\.py\s*$",                
    ]

    for pattern in command_patterns:
        if re.match(pattern, text):
            return True

    
    
    
    if "run" in text and re.search(r"\.py\b", text):
        return True

    return False

def handle_command(text: str) -> str:
    """
    Return safe response for command-like inputs
    """

    text = text.lower().strip()

    
    if text in {"exit", "quit"}:
        return "👋 Session ended. Start a new chat anytime."

    
    if re.search(r"python\s+\S+\.py", text):
        return (
            "⚠️ This looks like a code execution command.\n"
            "I only help with graduation project ideas and development."
        )

    
    if "pip install" in text or "npm install" in text:
        return (
            "⚠️ Installation commands are outside my scope.\n"
            "I can help you design your graduation project instead."
        )

    
    return (
        "⚠️ This looks like a system command.\n"
        "Please ask about graduation projects (ideas, features, or system design)."
    )
