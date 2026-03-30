from fastapi import APIRouter
import httpx
import os

from services.vector_store import search, get_client

router = APIRouter()

@router.get("/recommendations")
async def get_recommendations(studentId: str, topics: str = ""):
    node_url = os.environ.get("NODE_SERVICE_URL", "http://localhost:3000")

    if not topics:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{node_url}/api/analytics/weak-topics/{studentId}",
                timeout=10.0
            )
            weak = resp.json() if resp.status_code == 200 else []
        topic_list = [t["topic"] for t in weak]
    else:
        topic_list = [t.strip() for t in topics.split(",") if t.strip()]

    if not topic_list:
        return { "recommendations": [] }

    chroma_client = get_client()
    try:
        collections = [c.name for c in chroma_client.list_collections()]
    except Exception:
        collections = []

    recommendations = []
    for topic in topic_list[:5]:
        resources = []
        for col_name in collections:
            lecture_id = col_name.replace("lecture_", "")
            chunks = search(lecture_id, topic, n=1)
            if chunks:
                resources.append({
                    "lectureId": lecture_id,
                    "excerpt": chunks[0][:200]
                })
        recommendations.append({
            "topic": topic,
            "resources": resources[:2]
        })

    return { "recommendations": recommendations }
