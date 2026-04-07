from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import httpx
import os

from services.transcription import transcribe
from services.pdf_extractor import extract_text_from_pdf
from services.topic_extraction import extract_topics
from services.summarisation import summarise
from services.quiz_generation import generate_quiz
from services.vector_store import store_lecture

router = APIRouter()

class ProcessRequest(BaseModel):
    lectureId: str
    filePath: str
    fileType: str

async def run_pipeline(lecture_id: str, file_path: str, file_type: str):
    node_url = os.environ.get("NODE_SERVICE_URL", "http://localhost:4000")

    try:
        # step 1 — extract text
        print(f"[pipeline] extracting text from {file_type}")
        if file_type == "video":
            transcript = transcribe(file_path)
        else:
            transcript = extract_text_from_pdf(file_path)

        if not transcript:
            raise ValueError("Empty transcript")

        # step 2 — extract topics
        print("[pipeline] extracting topics")
        topics = extract_topics(transcript)

        # step 3 — summarise
        print("[pipeline] generating summary")
        summary = summarise(transcript)

        # step 4 — generate quiz
        print("[pipeline] generating quiz")
        questions = generate_quiz(transcript, topics)

        # step 5 — store embeddings
        print("[pipeline] storing embeddings")
        store_lecture(lecture_id, transcript)

        # step 6 — callback to Node
        print("[pipeline] sending callback to Node")
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{node_url}/api/lectures/{lecture_id}/callback",
                json={
                    "transcript": transcript,
                    "summary": summary,
                    "topics": topics,
                    "quizQuestions": questions,
                    "status": "done",
                },
                timeout=30.0
            )
        print(f"[pipeline] done for lecture {lecture_id}")

    except Exception as e:
        print(f"[pipeline] error: {e}")
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{node_url}/api/lectures/{lecture_id}/callback",
                json={ "status": "failed" },
                timeout=10.0
            )

@router.post("/process-lecture")
async def process_lecture(
    body: ProcessRequest,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(
        run_pipeline,
        body.lectureId,
        body.filePath,
        body.fileType
    )
    return { "status": "processing_started" }