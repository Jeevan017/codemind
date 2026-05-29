from retrieval.bm25_search import bm25_search
from retrieval.vector_search import vector_search
from config import TOP_K_RETRIEVAL

RRF_K = 60


def hybrid_search(query: str, top_k: int = TOP_K_RETRIEVAL, filters: dict = None) -> list[dict]:
    # run both searches in parallel
    bm25_results = bm25_search(query, top_k)
    vector_results = vector_search(query, top_k, filters)

    # apply RRF fusion
    fused_results = _rrf_fusion(bm25_results, vector_results)

    # return top k after fusion
    top_results = fused_results[:top_k]

    print(f"Hybrid search returned {len(top_results)} results for query: '{query}'")
    return top_results


def _rrf_fusion(
    bm25_results: list[dict],
    vector_results: list[dict]
) -> list[dict]:

    rrf_scores = {}
    all_chunks = {}

    # score from BM25 ranked list
    for item in bm25_results:
        chunk = item["chunk"]
        rank = item["rank"]
        doc_id = f"{chunk['filepath']}_{chunk['chunk_index']}"

        if doc_id not in rrf_scores:
            rrf_scores[doc_id] = 0
            all_chunks[doc_id] = chunk

        # RRF formula
        rrf_scores[doc_id] += 1 / (RRF_K + rank)

    # score from vector ranked list
    for item in vector_results:
        chunk = item["chunk"]
        rank = item["rank"]
        doc_id = f"{chunk['filepath']}_{chunk['chunk_index']}"

        if doc_id not in rrf_scores:
            rrf_scores[doc_id] = 0
            all_chunks[doc_id] = chunk

        # RRF formula
        rrf_scores[doc_id] += 1 / (RRF_K + rank)

    # sort by combined RRF score descending
    sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)

    # build final result list
    fused = []
    for rank, doc_id in enumerate(sorted_ids):
        fused.append({
            "chunk": all_chunks[doc_id],
            "rrf_score": rrf_scores[doc_id],
            "rank": rank + 1
        })

    return fused