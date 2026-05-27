from sentence_transformers import CrossEncoder
from config import RERANKER_MODEL, TOP_K_RERANK
import threading

_reranker = None
_reranker_lock = threading.Lock()


def _get_reranker():
    global _reranker
    with _reranker_lock:
        if _reranker is None:
            print(f"Loading reranker model: {RERANKER_MODEL}")
            _reranker = CrossEncoder(RERANKER_MODEL)
            print("Reranker model loaded.")
    return _reranker


def rerank(query: str, chunks: list[dict], top_k: int = TOP_K_RERANK) -> list[dict]:
    if not chunks:
        print("No chunks to rerank.")
        return []

    reranker = _get_reranker()
    pairs = [
        [query, chunk["chunk"]["text"]]
        for chunk in chunks
    ]

    scores = reranker.predict(pairs)

    for i, chunk in enumerate(chunks):
        chunk["rerank_score"] = float(scores[i])

    reranked = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)
    top_results = reranked[:top_k]

    print(f"Reranking complete. Top {len(top_results)} chunks selected.")
    return top_results
