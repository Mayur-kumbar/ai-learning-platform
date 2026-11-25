
import json

from services.gemini_client import call_gemini


QUIZ_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "lecture_quiz",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "topic": {"type": "string"},
                            "question": {
                                "type": "string"
                            },
                            "options": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            },
                            "correctIndex": {
                                "type": "integer"
                            },
                            "explanation": {
                                "type": "string"
                            }
                        },
                        "required": [
                            "topic",
                            "question",
                            "options",
                            "correctIndex",
                            "explanation"
                        ],
                        "additionalProperties": False
                    }
                }
            },
            "required": ["questions"],
            "additionalProperties": False
        }
    }
}


def validate_questions(data):

    if not isinstance(data, dict):
        raise ValueError("Response must be a JSON object.")

    questions = data.get("questions")

    if not isinstance(questions, list) or len(questions) != 5:
        raise ValueError("Exactly five questions are required.")

    validated = []

    for index, question in enumerate(questions):

        label = f"Question {index + 1}"

        if not isinstance(question, dict):
            raise ValueError(f"{label} is not an object.")

        question_text = question.get("question")
        options = question.get("options")
        correct_index = question.get("correctIndex")
        explanation = question.get("explanation")

        if not isinstance(question_text, str) or not question_text.strip():
            raise ValueError(f"{label} has invalid question text.")

        if (
            not isinstance(options, list)
            or len(options) != 4
            or not all(
                isinstance(option, str) and option.strip()
                for option in options
            )
        ):
            raise ValueError(
                f"{label} must contain exactly four non-empty options."
            )

        normalized_options = [
            option.strip().casefold() for option in options
        ]

        if len(set(normalized_options)) != 4:
            raise ValueError(f"{label} contains duplicate options.")

        if (
            isinstance(correct_index, bool)
            or not isinstance(correct_index, int)
            or correct_index not in range(4)
        ):
            raise ValueError(f"{label} has an invalid correctIndex.")

        if not isinstance(explanation, str) or not explanation.strip():
            raise ValueError(f"{label} has no explanation.")

        validated.append({
            "topic": str(question.get("topic") or "").strip(),
            "question": question_text.strip(),
            "options": [option.strip() for option in options],
            "correctIndex": correct_index,
            "explanation": explanation.strip(),
            "timestamp": None
        })

    return validated


def generate_quiz(transcript: str, topics: list[str]) -> list[dict]:

    if not isinstance(transcript, str) or len(transcript.strip()) < 100:
        raise ValueError(
            "Transcript is too short to generate a reliable quiz."
        )

    excerpt = transcript[:12000]
    topics_str = ", ".join(topics or [])

    prompt = f"""
You are an assessment-question generator.

Generate exactly FIVE high-quality multiple-choice questions
using ONLY the supplied lecture content.

LECTURE CONTENT:
{excerpt}

KEY TOPICS:
{topics_str}

STRICT REQUIREMENTS:

1. Generate exactly 5 questions.
2. Every question must test conceptual understanding.
3. Every question must have exactly 4 distinct options.
4. Only one option must be correct.
5. correctIndex must be an integer from 0 to 3.
6. Provide a clear explanation for each correct answer.
7. Avoid duplicate questions.
8. Do not introduce facts absent from the lecture.
9. Set topic to the matching key topic; use an empty string when none applies. Do not generate timestamps.
10. Do not include additional properties.

Generate questions covering different concepts from the lecture.
Do not make all questions about the same topic.

Return the JSON object matching the supplied schema.
"""

    last_error = None

    for attempt in range(1, 3):

        print(f"[quiz] Generation attempt {attempt}/2")

        try:

            # Increase token budget on retry.
            token_limit = 4096 if attempt == 1 else 6144

            raw = call_gemini(
                prompt,
                response_format=QUIZ_SCHEMA,
                max_completion_tokens=token_limit
            )

            data = json.loads(raw)

            questions = validate_questions(data)
            for item in questions:
                if item["topic"] not in (topics or []):
                    item["topic"] = ""

            print(
                f"[quiz] Successfully generated "
                f"{len(questions)} questions."
            )

            return questions

        except Exception as exc:

            last_error = str(exc)

            print(
                f"[quiz] Attempt {attempt} failed: {last_error}"
            )

            if attempt == 1:
                prompt += f"""

IMPORTANT:
Your previous generation failed validation:
{last_error}

Regenerate all five questions.
Follow the schema and requirements exactly.
"""

    raise ValueError(
        f"Quiz generation failed after 2 attempts: {last_error}"
    )
