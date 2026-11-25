from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import httpx
import os

from services.transcription import transcribe
from services.pdf_extractor import extract_text_from_pdf
from services.topic_extraction import extract_topics
from services.summarisation import summarise
from services.quiz_generation import generate_quiz
from services.vector_store import store_lecture
from services.youtube_transcript import fetch_youtube_transcript
from services.translation import translate_to_english

router = APIRouter()


class ProcessRequest(BaseModel):
    callbackToken: str
    lectureId: str
    filePath: str = ""
    fileType: str
    youtubeVideoId: Optional[str] = None


def get_node_url() -> str:
    return os.environ.get("NODE_SERVICE_URL", "http://localhost:4000").rstrip("/")


async def send_callback(lecture_id: str, token: str, payload: dict) -> None:
    url = f"{get_node_url()}/api/lectures/{lecture_id}/callback"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.put(url, json=payload, headers={"Authorization": f"Bearer {token}"})
        response.raise_for_status()


async def run_pipeline(
    lecture_id: str,
    file_path: str,
    file_type: str,
    callback_token: str,
    youtube_video_id: str = None,
):
    try:
        print(f"[pipeline] extracting text from {file_type}")

        if file_type == "youtube":
            result = fetch_youtube_transcript(
                video_id=youtube_video_id,
                preferred_languages=["en"],
                translate_to_english=False,
            )

            if not result.get("success"):
                error = result.get("error", "YouTube transcript unavailable")
                await send_callback(lecture_id, callback_token, {
                    "status": "partial",
                    "transcriptStatus": "unavailable",
                    "transcriptError": error,
                    "quizStatus": "unavailable",
                    "quizError": "Quiz generation requires an available transcript.",
                })
                return

            transcript = result["transcript"]
            language_code = (result.get("language_code") or "").lower()

            if language_code.startswith("hi"):
                print("[pipeline] Hindi transcript detected; translating to English")
                transcript = translate_to_english(transcript)

        elif file_type == "video":
            transcript = transcribe(file_path)
        elif file_type in ("pdf", "slides"):
            transcript = extract_text_from_pdf(file_path)
        else:
            raise ValueError(f"Unsupported lecture file type: {file_type}")

        if not isinstance(transcript, str) or not transcript.strip():
            raise ValueError("Transcript extraction returned empty content.")

        print("[pipeline] extracting topics")
        try:
            topics = extract_topics(transcript) or []
        except Exception:
            topics = []
            print("[pipeline] topic extraction unavailable")

        print("[pipeline] generating summary")
        try:
            summary = summarise(transcript) or ""
        except Exception:
            summary = ""
            print("[pipeline] summary unavailable")

        # Keep transcript processing successful even if AI quiz generation fails.
        quiz_questions = []
        quiz_status = "failed"
        quiz_error = ""
        try:
            print("[pipeline] generating quiz")
            quiz_questions = generate_quiz(transcript, topics)
            if not quiz_questions:
                raise ValueError("Quiz generator returned no questions.")
            quiz_status = "completed"
        except Exception as exc:
            quiz_error = str(exc)
            print(f"[pipeline] quiz generation failed: {quiz_error}")

        print("[pipeline] storing embeddings")
        try:
            store_lecture(lecture_id, transcript)
            index_status = "completed"
        except Exception:
            index_status = "failed"
            print("[pipeline] indexing unavailable; retaining extracted material")

        payload = {
            "transcript": transcript,
            "summary": summary,
            "topics": topics,
            "quizQuestions": quiz_questions,
            "status": "done" if quiz_questions and summary and topics and index_status == "completed" else "partial",
            "indexStatus": index_status,
            "transcriptStatus": "completed",
            "quizStatus": quiz_status,
            "quizError": quiz_error,
        }

        print("[pipeline] sending callback to Node")
        await send_callback(lecture_id, callback_token, payload)
        print(f"[pipeline] processing completed for lecture {lecture_id}")

    except Exception as exc:
        print(f"[pipeline] lecture processing failed: {exc}")
        try:
            await send_callback(lecture_id, callback_token, {
                "status": "failed",
                "transcriptStatus": "failed",
                "transcriptError": str(exc),
                "quizStatus": "failed",
                "quizError": "Quiz generation was skipped because transcript processing failed.",
            })
        except Exception as callback_exc:
            print(f"[pipeline] could not report failure to Node: {callback_exc}")


@router.post("/process-lecture")
async def process_lecture(
    body: ProcessRequest,
    background_tasks: BackgroundTasks,
):
    background_tasks.add_task(
        run_pipeline,
        body.lectureId,
        body.filePath,
        body.fileType,
        body.callbackToken,
        body.youtubeVideoId,
    )
    return {"status": "processing_started"}
