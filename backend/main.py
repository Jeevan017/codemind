import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import shutil
import tempfile

from ingestion.file_loader import load_from_github, load_from_local, cleanup_temp
from ingestion.chunker import chunk_files
from ingestion.embedder import embed_chunks
from ingestion.indexer import index_chunks, reset_index
from agent.agent import ask

app = FastAPI(
    title="CodeMind API",
    description="Universal project intelligence powered by Multimodal RAG",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GithubIngestRequest(BaseModel):
    github_url: str

class QuestionRequest(BaseModel):
    question: str
    language: Optional[str] = None
    file_type: Optional[str] = None


@app.get("/")
def root():
    return {"status": "CodeMind API is running"}


@app.post("/ingest/github")
def ingest_github(request: GithubIngestRequest):
    temp_dir = None
    try:
        print(f"Ingesting GitHub repo: {request.github_url}")
        files, temp_dir = load_from_github(request.github_url)

        if not files:
            raise HTTPException(
                status_code=400,
                detail="No supported files found in repo."
            )

        chunks = chunk_files(files)
        chunks = embed_chunks(chunks)
        index_chunks(chunks)

        return {
            "status": "success",
            "files_processed": len(files),
            "chunks_indexed": len(chunks),
            "github_url": request.github_url
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if temp_dir:
            cleanup_temp(temp_dir)


@app.post("/ingest/local")
async def ingest_local(files: List[UploadFile] = File(...)):
    temp_dir = tempfile.mkdtemp()

    try:
        for uploaded_file in files:
            safe_filename = os.path.basename(uploaded_file.filename)
            dest_path = os.path.join(temp_dir, safe_filename)
            with open(dest_path, "wb") as f:
                content = await uploaded_file.read()
                f.write(content)

        loaded_files = load_from_local(temp_dir)

        if not loaded_files:
            raise HTTPException(
                status_code=400,
                detail="No supported files found in upload."
            )

        chunks = chunk_files(loaded_files)
        chunks = embed_chunks(chunks)
        index_chunks(chunks)

        return {
            "status": "success",
            "files_processed": len(loaded_files),
            "chunks_indexed": len(chunks)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/ask")
def ask_question(request: QuestionRequest):
    try:
        filters = {}
        if request.language:
            filters["language"] = request.language
        if request.file_type:
            filters["file_type"] = request.file_type

        result = ask(
            question=request.question,
            filters=filters if filters else None
        )

        return {
            "status": "success",
            "question": request.question,
            "answer": result["answer"],
            "sources": result["sources"],
            "contexts": result.get("contexts", []),
            "decision": result["decision"],
            "used_web_search": result.get("used_web_search", False)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/reset")
def reset():
    try:
        reset_index()
        return {"status": "success", "message": "Index reset successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)