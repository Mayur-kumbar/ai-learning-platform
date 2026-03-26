from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class EngagementRequest(BaseModel):
    landmarks: list
    faceDetected: bool

def gaze_score(landmarks: list) -> float:
    try:
        left_iris   = landmarks[468]
        left_eye_l  = landmarks[33]
        left_eye_r  = landmarks[133]
        eye_width   = abs(left_eye_r["x"] - left_eye_l["x"]) + 1e-6
        offset      = abs(left_iris["x"] - (left_eye_l["x"] + eye_width / 2))
        return max(0.0, 1.0 - (offset / eye_width) * 4)
    except (IndexError, KeyError, TypeError):
        return 0.5

def head_pose_score(landmarks: list) -> float:
    try:
        nose      = landmarks[1]
        left_ear  = landmarks[234]
        right_ear = landmarks[454]
        face_center_x = (left_ear["x"] + right_ear["x"]) / 2
        face_width    = abs(right_ear["x"] - left_ear["x"]) + 1e-6
        deviation     = abs(nose["x"] - face_center_x)
        return max(0.0, 1.0 - (deviation / face_width) * 3)
    except (IndexError, KeyError, TypeError):
        return 0.5

@router.post("/engagement/score")
async def score_engagement(body: EngagementRequest):
    if not body.faceDetected or not body.landmarks:
        return { "score": 0.0 }

    gaze    = gaze_score(body.landmarks)
    head    = head_pose_score(body.landmarks)
    presence = 1.0

    final = round(
        min(max(0.5 * gaze + 0.3 * head + 0.2 * presence, 0.0), 1.0),
        3
    )
    return { "score": final }