from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

_model = None

def _get_embedding_model():
    global _model
    if _model is None:
        print(f"[EMBEDDER] Loading embedding model: {EMBEDDING_MODEL}")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print("[EMBEDDER] Embedding model loaded successfully.")
    return _model


def embed_chunks(chunks: list[dict]) -> list[dict]:
    if not chunks:
        print("[EMBEDDER] No chunks to embed.")
        return []

    model = _get_embedding_model()
    texts = [chunk["text"] for chunk in chunks]

    print(f"[EMBEDDER] Embedding {len(texts)} chunks...")

    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        convert_to_tensor=False,
        normalize_embeddings=True
    )

    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i].tolist()

    print("[EMBEDDER] Embedding complete.")
    return chunks


def embed_query(query: str) -> list[float]:
    # FIXED: was using bare `model` variable which caused NameError
    model = _get_embedding_model()
    embedding = model.encode(
        query,
        normalize_embeddings=True,
        convert_to_tensor=False
    )
    return embedding.tolist()