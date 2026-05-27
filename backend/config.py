import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "llama-3.1-8b-instant")

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

CHROMA_DB_PATH = "./chroma_db"
CHROMA_COLLECTION_NAME = "codemind"

CHUNK_SIZE = 300
CHUNK_OVERLAP = 30
TOP_K_RETRIEVAL = 20
TOP_K_RERANK = 5

SKIP_FOLDERS = {
    ".git", "node_modules", "__pycache__",
    ".venv", "venv", "dist", "build", ".idea"
}

SKIP_EXTENSIONS = {
    ".lock", ".bin", ".exe", ".pyc",
    ".class", ".o", ".zip", ".tar", ".gz"
}

LANGUAGE_MAP = {
    ".py": "Python", ".js": "JavaScript",
    ".ts": "TypeScript", ".java": "Java",
    ".go": "Go", ".rs": "Rust",
    ".cpp": "C++", ".c": "C",
    ".rb": "Ruby", ".php": "PHP",
    ".cs": "C#", ".swift": "Swift"
}

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".rst"}