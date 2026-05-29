from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL
import torch

_model = None

def _get_embedding_model():
    global _model
    if _model is None:
        print(f"Loading embedding model: {EMBEDDING_MODEL}")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print("Embedding model loaded.")
    return _model


def embed_chunks(chunks: list[dict]) -> list[dict]:
    if not chunks:
        print("No chunks to embed.")
        return []

    model = _get_embedding_model()
    texts = [chunk["text"] for chunk in chunks]

    print(f"Embedding {len(texts)} chunks...")

    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        convert_to_tensor=False,  # keep as numpy for ChromaDB
        normalize_embeddings=True  # normalize for better cosine similarity
    )

    # attach embedding to each chunk
    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i].tolist()

    print("Embedding complete.")
    return chunks


def embed_query(query: str) -> list[float]:
    embedding = model.encode(
        query,
        normalize_embeddings=True,
        convert_to_tensor=False
    )
    return embedding.tolist()