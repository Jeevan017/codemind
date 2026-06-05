from groq import Groq
from retrieval.hybrid_search import hybrid_search
from retrieval.reranker import rerank
from config import GROQ_API_KEY, GROQ_MODEL, TOP_K_RETRIEVAL
import urllib.request
import urllib.parse
import json

client = Groq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = (
    "You are CodeMind, an intelligent project assistant built to help developers "
    "understand any codebase, document, or project.\n\n"
    "CRITICAL ANTI-HALLUCINATION RULES:\n"
    "- NEVER invent or fabricate filenames, file paths, page numbers, or section numbers\n"
    "- NEVER cite a file that is not explicitly present in the provided context\n"
    "- NEVER make up code snippets that are not in the context\n"
    "- If you are not sure, say: I could not find this in the indexed documents\n"
    "- If context is empty or irrelevant, say so clearly and do not guess\n\n"
    "ANSWERING FROM INDEXED DOCUMENTS:\n"
    "- Only use information explicitly present in the provided context\n"
    "- Always cite the exact filename shown in the context\n"
    "- For code questions, quote the relevant code snippet from context\n"
    "- If context partially answers, say what was found and what was not\n\n"
    "ANSWERING FROM WEB SEARCH:\n"
    "- Clearly state the answer is from web search not indexed files\n"
    "- Cite the web source URL when available\n\n"
    "ANSWERING DIRECTLY:\n"
    "- For greetings, simple math, or general knowledge answer directly\n"
    "- Do NOT pretend to have searched any files when answering directly\n"
    "- Do NOT say I found this in file.xyz when answering from general knowledge\n\n"
    "WHEN INFORMATION IS NOT FOUND:\n"
    "- Say exactly: I could not find this information in the indexed documents\n"
    "- Do NOT guess or fabricate an answer\n"
    "- Do NOT suggest the user check a fake file\n\n"
    "TONE AND FORMAT:\n"
    "- Be concise and technical\n"
    "- Use bullet points for multi-part answers\n"
    "- Use code blocks for code snippets\n"
    "- Do not repeat the question back to the user\n"
    "- Do not say Great question or use filler phrases\n\n"
    "SPECIAL CASES:\n"
    "- If asked what you are: say you are CodeMind, a project intelligence tool built with RAG\n"
    "- If asked who built you: say you were built by Jeevan Kanugula\n"
    "- If asked about your tech stack: say you use Hybrid Search, CRAG, RAGAS, Groq, ChromaDB\n"
    "- If asked about your RAGAS scores: Answer Relevancy 0.91, Faithfulness 0.84, "
    "Context Precision 0.54, Context Recall 0.47\n"
    "- If user asks to summarize indexed files: do so based only on retrieved context"
)

SHOULD_RETRIEVE_PROMPT = (
    "Given this user question, decide the best action.\n\n"
    "Question: {question}\n\n"
    "Reply with exactly one of these words:\n"
    "- RETRIEVE: search the indexed project files\n"
    "- WEBSEARCH: search the web for current or live information\n"
    "- DIRECT: answer directly from general knowledge\n\n"
    "Use DIRECT for:\n"
    "- Greetings like hello, hi, how are you\n"
    "- Simple math like 2+2\n"
    "- Questions about CodeMind itself like who built it, what is CodeMind, what are your scores\n"
    "- General programming concepts not requiring file search\n\n"
    "Use WEBSEARCH for:\n"
    "- Current prices, live data, today's date, recent news\n\n"
    "Use RETRIEVE for:\n"
    "- Questions about indexed codebase or uploaded documents\n\n"
    "Reply with only one word."
)

CONTEXT_QUALITY_PROMPT = (
    "Given this question and retrieved context, "
    "is the context sufficient to answer the question well?\n\n"
    "Question: {question}\n\n"
    "Retrieved context:\n{context}\n\n"
    "Reply with only one word: SUFFICIENT or INSUFFICIENT"
)


def web_search(query: str, max_results: int = 3) -> list[dict]:
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 CodeMind/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        results = []
        if data.get("AbstractText"):
            results.append({
                "title": data.get("AbstractSource", "DuckDuckGo"),
                "body": data["AbstractText"],
                "href": data.get("AbstractURL", "")
            })
        if data.get("Answer"):
            results.append({
                "title": "Instant Answer",
                "body": data["Answer"],
                "href": ""
            })
        for topic in data.get("RelatedTopics", [])[:2]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("FirstURL", "Related"),
                    "body": topic["Text"],
                    "href": topic.get("FirstURL", "")
                })

        print(f"DuckDuckGo API returned {len(results)} results")
        if not results:
            return _fallback_search(query)
        return results

    except Exception as e:
        print(f"DuckDuckGo API error: {e}")
        return _fallback_search(query)


def _fallback_search(query: str) -> list[dict]:
    try:
        query_lower = query.lower()

        if any(word in query_lower for word in ["date", "time", "today", "now", "current time"]):
            from datetime import datetime
            import pytz
            ist = pytz.timezone("Asia/Kolkata")
            now = datetime.now(ist)
            formatted = now.strftime("%A, %d %B %Y, %I:%M %p IST")
            return [{
                "title": "Current Date and Time",
                "body": f"Today is {formatted}.",
                "href": ""
            }]

        if any(word in query_lower for word in ["bitcoin", "btc", "ethereum", "eth", "crypto", "price"]):
            coin = "bitcoin"
            if "ethereum" in query_lower or "eth" in query_lower:
                coin = "ethereum"
            elif "solana" in query_lower:
                coin = "solana"
            req = urllib.request.Request(
                f"https://api.coingecko.com/api/v3/simple/price?ids={coin}&vs_currencies=usd,inr",
                headers={"User-Agent": "CodeMind/1.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
            if coin in data:
                usd = data[coin].get("usd", "N/A")
                inr = data[coin].get("inr", "N/A")
                return [{
                    "title": f"{coin.title()} Price",
                    "body": f"Current {coin.title()} price: ${usd} USD / Rs.{inr} INR.",
                    "href": "https://coingecko.com"
                }]

        return []

    except Exception as e:
        print(f"Fallback search error: {e}")
        return []


def ask(question: str, filters: dict = None) -> dict:
    decision = _should_retrieve(question)
    print(f"Agent decision: {decision}")

    if decision == "DIRECT":
        answer = _answer_directly(question)
        return {
            "answer": answer,
            "sources": [],
            "contexts": [],
            "decision": "DIRECT",
            "used_web_search": False
        }

    if decision == "WEBSEARCH":
        return _handle_web_search(question)

    search_results = hybrid_search(question, TOP_K_RETRIEVAL, filters)

    if not search_results:
        print("No results from indexed docs — falling back to web search")
        return _handle_web_search(question, fallback=True)

    reranked_results = rerank(question, search_results)

    contexts = []
    for item in reranked_results:
        text = item.get("chunk", {}).get("text", "")
        if text:
            contexts.append(text)

    context, sources = _build_context(reranked_results)

    quality = _check_context_quality(question, context)
    print(f"Context quality: {quality}")

    if quality == "INSUFFICIENT":
        print("Context insufficient — falling back to web search")
        web_result = _handle_web_search(question, fallback=True)
        combined_answer = _generate_combined_answer(
            question, context, web_result["answer"]
        )
        return {
            "answer": combined_answer,
            "sources": sources + web_result.get("sources", []),
            "contexts": contexts,
            "decision": "RETRIEVE+WEBSEARCH",
            "used_web_search": True
        }

    answer = _generate_answer(question, context)

    return {
        "answer": answer,
        "sources": sources,
        "contexts": contexts,
        "decision": "RETRIEVE",
        "used_web_search": False
    }


def _handle_web_search(question: str, fallback: bool = False) -> dict:
    print(f"Running web search for: {question}")

    results = web_search(question)

    if not results:
        return {
            "answer": "I could not find relevant information in the indexed documents or on the web.",
            "sources": [],
            "contexts": [],
            "decision": "WEBSEARCH",
            "used_web_search": True
        }

    web_context = ""
    web_sources = []

    for i, result in enumerate(results):
        title = result.get("title", "")
        body = result.get("body", "")
        url = result.get("href", "")

        web_context += f"[Web Source {i+1}: {title}]\n{body}\n\n"
        web_sources.append({
            "filename": title,
            "filepath": url,
            "file_type": "web",
            "rerank_score": 0
        })

    answer = _generate_web_answer(question, web_context, fallback)

    return {
        "answer": answer,
        "sources": web_sources,
        "contexts": [r.get("body", "") for r in results],
        "decision": "WEBSEARCH" if not fallback else "RETRIEVE+WEBSEARCH",
        "used_web_search": True
    }


def _check_context_quality(question: str, context: str) -> str:
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": CONTEXT_QUALITY_PROMPT.format(
                        question=question,
                        context=context[:1000]
                    )
                }
            ],
            max_tokens=10,
            temperature=0
        )
        result = response.choices[0].message.content.strip().upper()
        if result not in ["SUFFICIENT", "INSUFFICIENT"]:
            return "SUFFICIENT"
        return result
    except Exception:
        return "SUFFICIENT"


def _should_retrieve(question: str) -> str:
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "user",
                "content": SHOULD_RETRIEVE_PROMPT.format(question=question)
            }
        ],
        max_tokens=10,
        temperature=0
    )
    decision = response.choices[0].message.content.strip().upper()
    if decision not in ["RETRIEVE", "WEBSEARCH", "DIRECT"]:
        return "RETRIEVE"
    return decision


def _build_context(reranked_results: list[dict]) -> tuple[str, list[dict]]:
    context_parts = []
    sources = []

    for i, result in enumerate(reranked_results):
        chunk = result["chunk"]
        text = chunk["text"]
        filename = chunk["filename"]
        filepath = chunk["filepath"]
        file_type = chunk["file_type"]

        context_parts.append(f"[Source {i+1}: {filename}]\n{text}\n")

        source = {
            "filename": filename,
            "filepath": filepath,
            "file_type": file_type,
            "rerank_score": result.get("rerank_score", 0)
        }
        if source not in sources:
            sources.append(source)

    context = "\n---\n".join(context_parts)
    return context, sources


def _generate_answer(question: str, context: str) -> str:
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": (
                    "Use the following context from the project files to answer the question.\n\n"
                    f"Context:\n{context}\n\n"
                    f"Question: {question}\n\n"
                    "Answer clearly and cite the filenames you used."
                )
            }
        ],
        max_tokens=1000,
        temperature=0.1
    )
    return response.choices[0].message.content


def _generate_web_answer(question: str, web_context: str, fallback: bool) -> str:
    prefix = "The indexed documents did not contain sufficient information. Using web search results:\n\n" if fallback else ""

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": (
                    f"{prefix}Use the following web search results to answer the question.\n\n"
                    f"Web Search Results:\n{web_context}\n\n"
                    f"Question: {question}\n\n"
                    "Answer clearly and cite the web sources you used."
                )
            }
        ],
        max_tokens=1000,
        temperature=0.1
    )
    return response.choices[0].message.content


def _generate_combined_answer(question: str, doc_context: str, web_answer: str) -> str:
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": (
                    "Combine these two sources to answer the question completely.\n\n"
                    f"From indexed project files:\n{doc_context}\n\n"
                    f"From web search:\n{web_answer}\n\n"
                    f"Question: {question}\n\n"
                    "Provide a complete answer citing both indexed files and web sources where used."
                )
            }
        ],
        max_tokens=1000,
        temperature=0.1
    )
    return response.choices[0].message.content


def _answer_directly(question: str) -> str:
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": question
            }
        ],
        max_tokens=500,
        temperature=0.1
    )
    return response.choices[0].message.content
