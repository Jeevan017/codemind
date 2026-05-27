# CodeMind — Universal Project Intelligence

> Ask questions about any codebase, document, or image in plain English.
> Get accurate, cited answers powered by Multimodal RAG + CRAG.

![Python](https://img.shields.io/badge/Python-3.13-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green)
![React](https://img.shields.io/badge/React-18-blue)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Local-orange)
![RAGAS](https://img.shields.io/badge/RAGAS-Evaluated-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

[View on GitHub](https://github.com/Jeevan017/codemind) | [All Projects](https://github.com/Jeevan017?tab=repositories)

---

## What is CodeMind?

CodeMind is a production-grade Multimodal RAG system that lets developers
ask natural language questions about any project — code, PDFs, images,
charts, diagrams — and get accurate answers with file citations.

It implements **Corrective RAG (CRAG)** — automatically falling back to
web search and live APIs when indexed content is insufficient.

**Example queries:**
- "Where is authentication handled in this codebase?"
- "Explain the architecture diagram in the docs folder"
- "What is the current price of Bitcoin in INR?"
- "What is today's date?"
- "According to README what is this project about?"

---

## RAGAS Evaluation Results

Evaluated using **Groq Llama 3.1 8B** as judge LLM and
**MiniLM-L6-v2** embeddings across **2452 indexed chunks**.

| Metric | Score | Interpretation |
|---|---|---|
| Faithfulness | **0.84** | 84% of answer claims grounded in retrieved context |
| Answer Relevancy | **0.91** | 91% relevance of answers to questions asked |
| Context Precision | **0.54** | 54% of retrieved chunks were truly relevant |
| Context Recall | **0.47** | 47% of needed information present in context |

> Evaluation used dynamically auto-generated test questions —
> no hardcoded test set. Judge LLM: Groq Llama 3.1 8B (free tier).

---

## Architecture
User Question
↓
Agent decides: RETRIEVE / WEBSEARCH / DIRECT
↓              ↓                ↓
Index Search    Web Search      Direct Answer
↓
Context Quality Check (CRAG)
↓              ↓
SUFFICIENT    INSUFFICIENT
↓              ↓
LLM Answer    Web Fallback
↓
Answer with citations + source badges
---

## RAG Techniques Implemented

- **Hybrid Search:** BM25 keyword search + ChromaDB vector search in parallel
- **RRF Fusion:** Reciprocal Rank Fusion (k=60) to merge candidate rankings
- **Cross-Encoder Reranking:** `cross-encoder/ms-marco-MiniLM-L-6-v2` reranks top candidates
- **Agentic RAG:** LLM chooses between `RETRIEVE` vs `WEBSEARCH` vs `DIRECT`
- **Corrective RAG (CRAG):** context quality check; if weak, automatically falls back to web search
- **Multimodal RAG:** images described via Groq Vision and stored as text for retrieval
- **Live Data Integration:** CoinGecko (prices) + `datetime` (time-aware answers)
- **RAGAS Evaluation:** automatically generated questions; reports Faithfulness, Answer Relevancy, Context Precision, Context Recall


---

## Tech Stack

### Core (RAG)
- **LLM:** Groq **Llama 3.1 70B** (free tier)
- **Vision:** Groq **Llama 3.2 Vision** (free tier)
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (local)
- **Vector DB:** **ChromaDB** (local)
- **Keyword Search:** **rank-bm25**
- **Reranking:** `cross-encoder/ms-marco-MiniLM-L-6-v2` (local)

### Corrective + Live Data
- **Corrective RAG (CRAG):** context quality check + automatic web fallback
- **Web Search:** DuckDuckGo API + CoinGecko + `datetime` (time)

### Backend / Frontend
- **Backend:** FastAPI + Uvicorn
- **Frontend:** React 18 + Tailwind + Framer Motion

### Evaluation
- **RAGAS:** Faithfulness, Answer Relevancy, Context Precision, Context Recall

**Total cost to run: ₹0**


---

## Supported File Types

**Source Code:** .py, .js, .ts, .java, .go, .rs, .cpp, .c, .rb, .php, .cs, .swift

**Documents:** .pdf, .docx, .txt, .md, .rst

**Images:** .png, .jpg, .jpeg, .gif, .svg, .webp

All programming languages supported — no restrictions.



---

## Project Structure

```
codemind/
├── backend/
│   ├── agent/
│   │   └── agent.py                # Agentic RAG + CRAG + web fallback
│   ├── evaluation/
│   │   ├── ragas_eval.py           # RAGAS evaluation pipeline
│   │   ├── ragas_results.txt       # Latest evaluation scores
│   │   └── eval_results.txt        # Custom evaluation results
│   ├── ingestion/
│   │   ├── file_loader.py          # GitHub + local file loading
│   │   ├── chunker.py              # Code + document + image chunking
│   │   ├── embedder.py             # MiniLM local embeddings
│   │   └── indexer.py              # ChromaDB + BM25 dual indexing
│   ├── retrieval/
│   │   ├── bm25_search.py          # BM25 keyword search
│   │   ├── vector_search.py        # ChromaDB semantic search
│   │   ├── hybrid_search.py        # RRF fusion
│   │   └── reranker.py             # Cross-encoder reranking
│   ├── config.py                   # All configuration settings
│   └── main.py                     # FastAPI REST API server
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   └── src/
│       ├── components/
│       │   ├── Sidebar.tsx         # File ingestion + filters
│       │   ├── ChatArea.tsx        # Message display
│       │   ├── InputBar.tsx        # Question input
│       │   ├── BottomSheet.tsx     # Mobile sidebar drawer
│       │   ├── SkeletonLoader.tsx  # Loading states
│       │   └── InspectorPanel.tsx  # Source inspector
│       ├── App.tsx                 # Main React app
│       ├── types.ts                # TypeScript types
│       ├── index.tsx               # React entry point
│       └── index.css               # Global styles
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key — free at [console.groq.com](https://console.groq.com)

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

Create `backend/.env`:

From indexed docs
"Where is authentication handled?"
"According to README what is this project?"
"Explain the database schema"

Live data via CRAG web fallback
"What is today's date?"
"What is the current Bitcoin price in INR?"
"What is the Ethereum price right now?"

### Run RAGAS Evaluation

```bash
cd backend
python evaluation/ragas_eval.py
```

Auto-generates test questions from indexed content.
Results saved to `backend/evaluation/ragas_results.txt`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | / | Health check |
| POST | /ingest/github | Index a GitHub repository |
| POST | /ingest/local | Index local files |
| POST | /ask | Ask a question |
| DELETE | /reset | Reset the index |

### Example Request

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How does authentication work?"}'
```

### Example Response

```json
{
  "status": "success",
  "question": "How does authentication work?",
  "answer": "Authentication is handled in auth/views.py...",
  "sources": [
    {
      "filename": "auth/views.py",
      "filepath": "/repo/auth/views.py",
      "file_type": "code",
      "rerank_score": 0.94
    }
  ],
  "contexts": ["chunk text 1", "chunk text 2"],
  "decision": "RETRIEVE",
  "used_web_search": false
}
```

---

## Configuration

All settings in `backend/config.py`:

| Variable | Default | Description |
|---|---|---|
| CHUNK_SIZE | 300 | Token size per chunk |
| CHUNK_OVERLAP | 30 | Overlap between chunks |
| TOP_K_RETRIEVAL | 20 | Candidates from hybrid search |
| TOP_K_RERANK | 5 | Final chunks sent to LLM |
| EMBEDDING_MODEL | all-MiniLM-L6-v2 | Local embedding model |
| RERANKER_MODEL | ms-marco-MiniLM-L-6-v2 | Local reranker |
| GROQ_MODEL | llama-3.1-70b-versatile | LLM for generation |
| GROQ_VISION_MODEL | llama-3.2-11b-vision-preview | Vision model |

---

## How It Works

### Ingestion
Files loaded from GitHub or local upload. Code chunked by function
boundaries. Documents chunked by paragraph. Images described by
Groq Vision and stored as searchable text. Each chunk embedded
with MiniLM and stored in ChromaDB + BM25 simultaneously.

### Retrieval
Every query runs BM25 and vector search in parallel. Results merged
using RRF fusion, re-scored by cross-encoder. Top 5 chunks selected.

### CRAG — Corrective RAG
Agent evaluates retrieved context quality. If insufficient, automatically
falls back to web search. Live data queries (crypto prices, date/time)
handled via dedicated API integrations. Three decision paths:
RETRIEVE → WEBSEARCH → DIRECT.

### Evaluation
RAGAS auto-generates test questions from indexed content, runs the
full pipeline, measures all 4 metrics using LLM-as-judge approach.

---

## Interview Talking Points

- Hybrid search with RRF outperforms either BM25 or vector search alone
- Cross-encoder reranking reduces noise by re-scoring candidates jointly
- CRAG pattern prevents hallucination by validating context quality
- RAGAS evaluation provides measurable, reproducible quality metrics
- Zero cost stack — every component is free or open source
- Multimodal support handles code + docs + images in one pipeline

---

## Built By

**Jeevan Kanugula**
B.E Information Technology — Vasavi College of Engineering, Hyderabad

[LinkedIn](https://linkedin.com/in/jeevan-kanugula-527a0031a) |
[GitHub](https://github.com/Jeevan017) |
[CodeMind Repository](https://github.com/Jeevan017/codemind) |
jeevankanugula99@gmail.com

---

## License

MIT License — free to use, modify, and distribute.