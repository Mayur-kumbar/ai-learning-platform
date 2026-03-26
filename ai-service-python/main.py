from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routes import process, engagement, recommendations

load_dotenv()

app = FastAPI(title="AI Learning Platform — AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(process.router)
app.include_router(engagement.router)
app.include_router(recommendations.router)

@app.get("/health")
async def health():
    return { "status": "ok" }