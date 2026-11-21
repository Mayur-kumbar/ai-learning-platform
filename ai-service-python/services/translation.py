
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def translate_to_english(text: str) -> str:

    if not text or not text.strip():
        raise ValueError("Input transcript is empty.")

    try:
        print(f"[translation] input characters: {len(text)}")

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": """
You are an expert Hindi-to-English translator
specializing in technical educational lectures.

Translate Hindi speech-to-text transcripts into
clear, grammatically correct English.

Rules:
1. Preserve the complete meaning and information.
2. Do not summarize or shorten the transcript.
3. Correct obvious speech recognition errors using context.
4. Use standard technical terminology.
5. Convert awkward spoken Hindi into natural English.
6. Preserve names of technologies, models and frameworks.
7. Do not invent missing information.
8. Return only the translated transcript.
"""
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            temperature=0.1,
            max_completion_tokens=4096
        )

        # Debug response
        print("[translation] finish reason:", response.choices[0].finish_reason)

        translated_text = response.choices[0].message.content

        if not translated_text:
            print("[translation] Empty response from Groq")
            print("[translation] Full response:", response.model_dump())
            raise ValueError("Groq returned empty translation.")

        translated_text = translated_text.strip()

        if not translated_text:
            raise ValueError("Translation contains only whitespace.")

        print(f"[translation] output characters: {len(translated_text)}")

        return translated_text

    except Exception as e:
        print(f"[translation] error: {type(e).__name__}: {e}")
        raise
