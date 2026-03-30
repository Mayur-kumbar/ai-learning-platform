from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client

def call_gemini(prompt: str) -> str:
    client = get_client()
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{ "role": "user", "content": prompt }],
        max_tokens=1024,
    )
    return response.choices[0].message.content.strip()
