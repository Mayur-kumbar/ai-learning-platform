import chromadb
from sentence_transformers import SentenceTransformer
import os

_client = None
_embedder = None

def get_client():
    global _client
    if _client is None:
        chroma_path = os.environ.get("CHROMA_PATH", "./chroma_db")
        _client = chromadb.PersistentClient(path=chroma_path)
    return _client

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder

def chunk_text(text: str, size: int = 512) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), size):
        chunks.append(" ".join(words[i:i + size]))
    return chunks

def store_lecture(lecture_id: str, text: str):
    client = get_client()
    embedder = get_embedder()

    collection = client.get_or_create_collection(f"lecture_{lecture_id}")
    chunks = chunk_text(text)

    if not chunks:
        return

    embeddings = embedder.encode(chunks).tolist()
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[f"chunk_{i}" for i in range(len(chunks))]
    )

def search(lecture_id: str, query: str, n: int = 3) -> list[str]:
    client = get_client()
    embedder = get_embedder()

    try:
        collection = client.get_collection(f"lecture_{lecture_id}")
        query_embedding = embedder.encode([query]).tolist()
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=n
        )
        return results["documents"][0]
    except Exception as e:
        print(f"Vector search error: {e}")
        return []