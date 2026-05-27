from retrieval.bm25_search import bm25_search
from retrieval.vector_search import vector_search
from config import TOP_K_RETRIEVAL

RRF_K = 60


def hybrid_search(query: str, top_k: int = TOP_K_RETRIEVAL, filters: dict = None) -> list[dict]:
    bm25_results = bm25_search(query, top_k)
    vector_results = vector_search(query, top_k, filters)
    fused_results = _rrf_fusion(bm25_results, vector_results)
    top_results = fused_results[:top_k]

    print(f"Hybrid search returned {len(top_results)} results for query: '{query}'")
    return top_results


def _rrf_fusion(bm25_results: list[dict], vector_results: list[dict]) -> list[dict]:
    rrf_scores = {}
    all_chunks = {}

    for item in bm25_results:
        chunk = item["chunk"]
        rank = item["rank"]
        doc_id = f"{chunk['filepath']}_{chunk['chunk_index']}"
        if doc_id not in rrf_scores:
            rrf_scores[doc_id] = 0
            all_chunks[doc_id] = chunk
        rrf_scores[doc_id] += 1 / (RRF_K + rank)

    for item in vector_results:
        chunk = item["chunk"]
        rank = item["rank"]
        doc_id = f"{chunk['filepath']}_{chunk['chunk_index']}"
        if doc_id not in rrf_scores:
            rrf_scores[doc_id] = 0
            all_chunks[doc_id] = chunk
        rrf_scores[doc_id] += 1 / (RRF_K + rank)

    sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)
    fused = []
    for rank, doc_id in enumerate(sorted_ids, start=1):
        fused.append({
            "chunk": all_chunks[doc_id],
            "rrf_score": rrf_scores[doc_id],
            "rank": rank
        })

    return fused
