from config import CHROMA_DB_PATH, CHROMA_COLLECTION_NAME, TOP_K_RETRIEVAL
import chromadb

chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)


def vector_search(query: str, top_k: int = TOP_K_RETRIEVAL, filters: dict = None) -> list[dict]:
    collection = chroma_client.get_or_create_collection(name=CHROMA_COLLECTION_NAME)

    query_results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where=filters,
        include=["metadatas", "documents", "distances"]
    )

    results = []
    if not query_results or not query_results.get("ids"):
        print(f"Vector search found no results for query: '{query}'")
        return results

    for rank, (metadata, document, distance) in enumerate(zip(
        query_results["metadatas"][0],
        query_results["documents"][0],
        query_results["distances"][0]
    ), start=1):
        chunk = {
            "filepath": metadata.get("filepath"),
            "filename": metadata.get("filename"),
            "text": document,
            "file_type": metadata.get("file_type"),
            "chunk_index": metadata.get("chunk_index"),
            "embedding": None
        }
        results.append({
            "chunk": chunk,
            "score": float(distance),
            "rank": rank
        })

    print(f"Vector search returned {len(results)} results for query: '{query}'")
    return results
