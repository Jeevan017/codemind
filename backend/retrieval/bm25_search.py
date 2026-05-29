from ingestion.indexer import load_bm25_index
from config import TOP_K_RETRIEVAL


def bm25_search(query: str, top_k: int = TOP_K_RETRIEVAL) -> list[dict]:
    bm25, chunks = load_bm25_index()

    # tokenize query the same way we tokenized corpus
    tokenized_query = query.lower().split()

    # get scores for every chunk
    scores = bm25.get_scores(tokenized_query)

    # pair each chunk with its score and rank them
    scored_chunks = [
        {"chunk": chunks[i], "score": float(scores[i]), "rank": 0}
        for i in range(len(chunks))
    ]

    # sort by score descending
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)

    # assign rank positions starting from 1
    for i, item in enumerate(scored_chunks):
        item["rank"] = i + 1

    # return top k only
    top_results = scored_chunks[:top_k]

    print(f"BM25 returned {len(top_results)} results for query: '{query}'")
    return top_results