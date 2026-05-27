from ingestion.indexer import load_bm25_index
from config import TOP_K_RETRIEVAL


def bm25_search(query: str, top_k: int = TOP_K_RETRIEVAL) -> list[dict]:
    bm25, chunks = load_bm25_index()
    tokens = query.lower().split()
    scores = bm25.get_scores(tokens)
    ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

    results = []
    for rank, index in enumerate(ranked_indices, start=1):
        results.append({
            "chunk": chunks[index],
            "score": float(scores[index]),
            "rank": rank
        })

    print(f"BM25 search returned {len(results)} results for query: '{query}'")
    return results
