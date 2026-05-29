import chromadb
from ingestion.embedder import embed_query
from config import CHROMA_DB_PATH, CHROMA_COLLECTION_NAME, TOP_K_RETRIEVAL

chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)


def vector_search(query: str, top_k: int = TOP_K_RETRIEVAL, filters: dict = None) -> list[dict]:
    collection = chroma_client.get_or_create_collection(
        name=CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

    # embed the query into the same vector space as chunks
    query_embedding = embed_query(query)

    # build where clause for metadata filtering
    where = filters if filters else None

    # search ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"]
    )

    # format results into ranked list
    scored_chunks = []

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    for i in range(len(documents)):
        # ChromaDB returns distance — convert to similarity score
        similarity = 1 - distances[i]

        scored_chunks.append({
            "chunk": {
                "text": documents[i],
                "filepath": metadatas[i]["filepath"],
                "filename": metadatas[i]["filename"],
                "file_type": metadatas[i]["file_type"],
                "language": metadatas[i]["language"],
                "chunk_index": metadatas[i]["chunk_index"]
            },
            "score": similarity,
            "rank": i + 1
        })

    print(f"Vector search returned {len(scored_chunks)} results for query: '{query}'")
    return scored_chunks


def vector_search_by_language(query: str, language: str, top_k: int = TOP_K_RETRIEVAL) -> list[dict]:
    filters = {"language": language}
    return vector_search(query, top_k, filters)


def vector_search_by_type(query: str, file_type: str, top_k: int = TOP_K_RETRIEVAL) -> list[dict]:
    filters = {"file_type": file_type}
    return vector_search(query, top_k, filters)