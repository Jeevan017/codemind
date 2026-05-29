from sentence_transformers import CrossEncoder
from config import RERANKER_MODEL, TOP_K_RERANK

print(f"Loading reranker model: {RERANKER_MODEL}")
reranker = CrossEncoder(RERANKER_MODEL)
print("Reranker model loaded.")


def rerank(query: str, chunks: list[dict], top_k: int = TOP_K_RERANK) -> list[dict]:
    if not chunks:
        print("No chunks to rerank.")
        return []

    # prepare query-document pairs for cross encoder
    pairs = [
        [query, chunk["chunk"]["text"]]
        for chunk in chunks
    ]

    # get relevance scores from cross encoder
    scores = reranker.predict(pairs)

    # attach scores to chunks
    for i, chunk in enumerate(chunks):
        chunk["rerank_score"] = float(scores[i])

    # sort by rerank score descending
    reranked = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)

    # return top k
    top_results = reranked[:top_k]
    print(f"DEBUG reranker returning {len(top_results)} results")
    for i, r in enumerate(top_results):
        print(f"DEBUG result {i} keys: {list(r.keys())}")

    print(f"Reranking complete. Top {len(top_results)} chunks selected.")
    return top_results