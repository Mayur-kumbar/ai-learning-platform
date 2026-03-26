from services.gemini_client import call_gemini
import json

def generate_quiz(transcript: str, topics: list[str]) -> list[dict]:
    excerpt = transcript[:3000]
    topics_str = ", ".join(topics)

    prompt = f"""You are a quiz generator. Based on this lecture content generate exactly 5 multiple choice questions.

LECTURE:
{excerpt}

KEY TOPICS: {topics_str}

STRICT RULES:
- Return ONLY a valid JSON array. No explanation, no markdown, no extra text.
- Each object must have exactly these keys:
  "question" (string)
  "options" (array of exactly 4 strings)
  "correctIndex" (integer 0-3)
- Test understanding not memorization.

JSON array:"""

    raw = call_gemini(prompt)

    # strip markdown fences if model adds them
    if "```" in raw:
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        questions = json.loads(raw.strip())
        for q in questions:
            assert "question" in q
            assert "options" in q and len(q["options"]) == 4
            assert "correctIndex" in q and 0 <= int(q["correctIndex"]) <= 3
        return questions
    except Exception as e:
        print(f"Quiz parse error: {e}\nRaw response: {raw}")
        return []