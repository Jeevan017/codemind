import chromadb
from rank_bm25 import BM25Okapi
from config import CHROMA_DB_PATH, CHROMA_COLLECTION_NAME
import pickle
import os

# initialize ChromaDB client
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)


def index_chunks(chunks: list[dict]):
    if not chunks:
        print("No chunks to index.")
        return

    _index_in_chroma(chunks)
    _index_in_bm25(chunks)
    print("Indexing complete.")


def _index_in_chroma(chunks: list[dict]):
    print("Indexing into ChromaDB...")

    collection = chroma_client.get_or_create_collection(
        name=CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

    ids = []
    embeddings = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        chunk_id = f"{chunk['filename']}_{chunk['chunk_index']}_{i}"

        ids.append(chunk_id)
        embeddings.append(chunk["embedding"])
        documents.append(chunk["text"])
        metadatas.append({
            "filepath": chunk["filepath"],
            "filename": chunk["filename"],
            "file_type": chunk["file_type"],
            "language": chunk["language"] or "unknown",
            "chunk_index": chunk["chunk_index"]
        })

    # add in batches of 100 to avoid memory issues
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        collection.add(
            ids=ids[i:i+batch_size],
            embeddings=embeddings[i:i+batch_size],
            documents=documents[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size]
        )
        print(f"Indexed batch {i//batch_size + 1}")

    print(f"ChromaDB indexing complete. Total: {len(ids)} chunks.")


def _index_in_bm25(chunks: list[dict]):
    print("Building BM25 index...")

    tokenized_corpus = [
        chunk["text"].lower().split()
        for chunk in chunks
    ]

    bm25 = BM25Okapi(tokenized_corpus)

    # save BM25 index and chunks to disk
    bm25_data = {
        "bm25": bm25,
        "chunks": chunks
    }

    bm25_path = os.path.join(CHROMA_DB_PATH, "bm25_index.pkl")
    os.makedirs(CHROMA_DB_PATH, exist_ok=True)

    with open(bm25_path, "wb") as f:
        pickle.dump(bm25_data, f)

    print(f"BM25 index saved to {bm25_path}")


def load_bm25_index() -> tuple[BM25Okapi, list[dict]]:
    bm25_path = os.path.join(CHROMA_DB_PATH, "bm25_index.pkl")

    if not os.path.exists(bm25_path):
        raise FileNotFoundError("BM25 index not found. Please ingest files first.")

    with open(bm25_path, "rb") as f:
        bm25_data = pickle.load(f)

    return bm25_data["bm25"], bm25_data["chunks"]


def reset_index():
    try:
        chroma_client.delete_collection(CHROMA_COLLECTION_NAME)
        print("ChromaDB collection deleted.")
    except Exception as e:
        print(f"Could not delete collection: {e}")

    bm25_path = os.path.join(CHROMA_DB_PATH, "bm25_index.pkl")
    if os.path.exists(bm25_path):
        os.remove(bm25_path)
        print("BM25 index deleted.")