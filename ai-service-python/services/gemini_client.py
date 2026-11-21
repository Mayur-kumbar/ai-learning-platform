
import os
from functools import lru_cache

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

MODEL_NAME = "openai/gpt-oss-20b"


@lru_cache(maxsize=1)
def get_client():
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing from environment.")

    return Groq(api_key=api_key)


def call_gemini(
    prompt: str,
    response_format=None,
    max_completion_tokens: int = 4096,
) -> str:

    client = get_client()

    request_args = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_completion_tokens": max_completion_tokens,
        "reasoning_effort": "low",
    }

    if response_format is not None:
        request_args["response_format"] = response_format

    response = client.chat.completions.create(**request_args)

    choice = response.choices[0]
    content = choice.message.content or ""

    print(
        f"[groq] Model: {MODEL_NAME} | "
        f"Finish reason: {choice.finish_reason} | "
        f"Response length: {len(content)}"
    )

    if choice.finish_reason == "length":
        raise RuntimeError(
            "Groq response was truncated because the completion "
            f"token limit ({max_completion_tokens}) was reached."
        )

    if not content.strip():
        raise RuntimeError("Groq returned an empty response.")

    return content.strip()
