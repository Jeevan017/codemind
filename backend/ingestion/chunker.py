import os
from PIL import Image
from unstructured.partition.pdf import partition_pdf
from unstructured.partition.docx import partition_docx
from unstructured.partition.text import partition_text
from groq import Groq
import base64
from config import CHUNK_SIZE, CHUNK_OVERLAP, GROQ_API_KEY, GROQ_VISION_MODEL

_groq_client = None

def _get_groq_client():
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client


def chunk_files(files: list[dict]) -> list[dict]:
    all_chunks = []

    for file in files:
        file_type = file["file_type"]

        if file_type == "code":
            chunks = _chunk_code(file)
        elif file_type == "document":
            chunks = _chunk_document(file)
        elif file_type == "image":
            chunks = _chunk_image(file)
        else:
            continue

        all_chunks.extend(chunks)

    print(f"Total chunks created: {len(all_chunks)}")
    return all_chunks


def _chunk_code(file: dict) -> list[dict]:
    try:
        with open(file["filepath"], "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as e:
        print(f"Could not read {file['filepath']}: {e}")
        return []

    chunks = []
    lines = content.split("\n")
    current_chunk = []
    current_size = 0

    for line in lines:
        current_chunk.append(line)
        current_size += len(line)

        if current_size >= CHUNK_SIZE:
            chunk_text = "\n".join(current_chunk)
            chunks.append(_make_chunk(
                text=chunk_text,
                file=file,
                chunk_index=len(chunks)
            ))
            # overlap — keep last few lines for context
            current_chunk = current_chunk[-CHUNK_OVERLAP:]
            current_size = sum(len(l) for l in current_chunk)

    # add remaining lines as final chunk
    if current_chunk:
        chunk_text = "\n".join(current_chunk)
        chunks.append(_make_chunk(
            text=chunk_text,
            file=file,
            chunk_index=len(chunks)
        ))

    return chunks


def _chunk_document(file: dict) -> list[dict]:
    ext = file["extension"]
    filepath = file["filepath"]
    elements = []

    try:
        if ext == ".pdf":
            elements = partition_pdf(filename=filepath)
        elif ext == ".docx":
            elements = partition_docx(filename=filepath)
        elif ext in [".txt", ".md", ".rst"]:
            elements = partition_text(filename=filepath)
    except Exception as e:
        print(f"[CHUNKER] ERROR: Could not parse document {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return []

    print(f"[CHUNKER] Extracted {len(elements)} elements from {file['filename']}")

    full_text = " ".join(str(e).strip() for e in elements if str(e).strip())
    print(f"[CHUNKER] Total characters extracted: {len(full_text)}")
    print(f"[CHUNKER] First 500 chars: {full_text[:500]}")

    if not full_text.strip():
        print(f"[CHUNKER] ERROR: Empty text from {filepath} — file may be corrupted or image-based.")
        return []

    chunks = []
    start = 0

    while start < len(full_text):
        end = start + CHUNK_SIZE
        chunk_text = full_text[start:end].strip()

        if chunk_text:
            chunks.append(_make_chunk(
                text=chunk_text,
                file=file,
                chunk_index=len(chunks)
            ))

        # slide forward keeping overlap for context continuity
        start += CHUNK_SIZE - CHUNK_OVERLAP

    print(f"[CHUNKER] Created {len(chunks)} chunks from {file['filename']}")
    return chunks


def _chunk_image(file: dict) -> list[dict]:
    filepath = file["filepath"]

    try:
        # convert image to base64
        with open(filepath, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")

        ext = file["extension"].replace(".", "")
        if ext == "jpg":
            ext = "jpeg"

        # send to Groq vision model to describe the image
        client = _get_groq_client()
        response = client.chat.completions.create(
            model=GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/{ext};base64,{image_data}"
                            }
                        },
                        {
                            "type": "text",
                            "text": "Describe this image in detail. If it contains a chart, graph, diagram or architecture, explain what it shows including all labels, values, and relationships."
                        }
                    ]
                }
            ],
            max_tokens=500
        )

        description = response.choices[0].message.content

        return [_make_chunk(
            text=f"[IMAGE DESCRIPTION] {description}",
            file=file,
            chunk_index=0
        )]

    except Exception as e:
        print(f"Could not process image {filepath}: {e}")
        return []


def _make_chunk(text: str, file: dict, chunk_index: int) -> dict:
    return {
        "text": text,
        "filepath": file["filepath"],
        "filename": file["filename"],
        "file_type": file["file_type"],
        "language": file.get("language"),
        "chunk_index": chunk_index
    }