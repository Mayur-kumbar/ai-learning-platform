from services.gemini_client import call_gemini

def summarise(transcript: str) -> str:
    excerpt = transcript[:4000]
    prompt = f"""Summarise this lecture in exactly 5 bullet points.
Each bullet point must be one clear sentence.
Return only the bullet points, no other text, no numbering.

LECTURE:
{excerpt}

SUMMARY:"""
    return call_gemini(prompt)